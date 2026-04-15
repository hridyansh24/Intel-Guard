from typing import Literal, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.services.extractor import extract_text, extract_text_multi
from backend.services.context_store import load_context
from backend.services.llm import call_llm, call_llm_json
from backend.services.result_cache import get_cached_result, save_result, get_quiz_pool, save_quiz_pool, pick_from_pool
from backend.services.style_analyzer import analyze_style, get_scalar_metrics, get_vector_metrics
from backend.services.style_store import get_profile, update_profile, compute_deviation, compute_confidence_score, MIN_WORD_COUNT
from backend.services.submission_store import save_submission as _save_sub
from backend.services.student_store import get_student
from backend.services.class_store import get_context_settings
from backend.prompts import (
    AI_DETECTION_SYSTEM_PROMPT, AI_DETECTION_CODE_PROMPT, QUIZ_GENERATION_PROMPT, SUMMARY_PROMPT,
    STYLE_FINGERPRINT_PROSE_PROMPT, STYLE_FINGERPRINT_CODE_PROMPT,
)
from backend.schemas import SubmitResponse

router = APIRouter(prefix="/submit", tags=["submit"])


@router.post("/", response_model=SubmitResponse)
async def submit(
    context_id: str = Form(...),
    files: list[UploadFile] = File(..., description="Upload 1-10 submission files"),
    mode: Literal["quiz", "summary", "both"] = Form("quiz"),
    num_questions: int = Form(3),
    student_id: Optional[str] = Form(None),
    class_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed.")
    context = await load_context(db, context_id)
    if len(files) == 1:
        submission_text, file_type = await extract_text(files[0], db)
    else:
        submission_text, file_type = await extract_text_multi(files, db)

    # Determine skip_detection from class settings
    skip_detection = False
    if class_id:
        try:
            ctx_settings = await get_context_settings(db, class_id, context_id)
            skip_detection = ctx_settings.get("skip_detection", False)
        except Exception:
            pass

    spec = context["spec_text"]
    result = {
        "context_id": context_id,
        "extracted_text": submission_text,
        "file_type": file_type,
        "ai_detection": None,
        "quiz": None,
        "summary": None,
        "style_analysis": None,
        "confidence_score": None,
    }

    # --- Fetch student's style profile (needed for both AI detection and style analysis) ---
    profile = None
    style_summary = ""
    if student_id:
        profile = await get_profile(db, student_id)
        if profile:
            style_summary = profile.get("style_summary", "")

    # --- AI Detection ---
    ai_probability = None
    if not skip_detection:
        cached_detect = await get_cached_result(db, context_id, submission_text, "analyze")
        if cached_detect is not None:
            detection = cached_detect
        else:
            detect_msg = (
                f"ASSIGNMENT SPECIFICATION:\n{spec}\n\n"
                f"STUDENT SUBMISSION ({file_type}):\n{submission_text}"
            )
            if style_summary:
                detect_msg += f"\n\nSTUDENT WRITING STYLE PROFILE:\n{style_summary}"
            is_code = "code" in file_type and "text" not in file_type and "pdf" not in file_type
            prompt = AI_DETECTION_CODE_PROMPT if is_code else AI_DETECTION_SYSTEM_PROMPT
            detection = await call_llm_json(prompt, detect_msg)
            if is_code:
                from backend.routers.analyze import _map_code_result
                detection = _map_code_result(detection)
            await save_result(db, context_id, submission_text, "analyze", detection)
        result["ai_detection"] = detection
        ai_probability = detection.get("ai_probability")

    # --- Writing Style Analysis ---
    if student_id and len(submission_text.split()) >= MIN_WORD_COUNT:
        style_data = analyze_style(submission_text, file_type)
        scalars = get_scalar_metrics(style_data)
        vectors = get_vector_metrics(style_data)

        qualitative = None
        prompt = STYLE_FINGERPRINT_CODE_PROMPT if style_data["content_type"] == "code" else STYLE_FINGERPRINT_PROSE_PROMPT
        user_msg = f"ASSIGNMENT SPECIFICATION:\n{spec}\n\nSTUDENT SUBMISSION:\n{submission_text}"
        qual_result = await call_llm_json(prompt, user_msg, use_mini=True)
        if "_parse_failed" not in qual_result:
            qualitative = qual_result

        if profile:
            deviation = compute_deviation(profile, scalars, vectors, qualitative)
            result["style_analysis"] = deviation
            result["confidence_score"] = compute_confidence_score(
                ai_probability=ai_probability,
                style_deviation=deviation["style_deviation_score"],
            )

        await update_profile(
            db, student_id=student_id, scalar_metrics=scalars, vector_metrics=vectors,
            qualitative=qualitative, context_id=context_id, content_type=style_data["content_type"],
        )

    elif student_id and ai_probability is not None:
        result["confidence_score"] = compute_confidence_score(ai_probability=ai_probability, style_deviation=0.0)

    # --- Quiz Generation ---
    if mode in ("quiz", "both"):
        pool_size = num_questions * 4

        async def _generate_quiz_pool():
            system = QUIZ_GENERATION_PROMPT.format(num_questions=pool_size)
            quiz_msg = f"ASSIGNMENT SPECIFICATION:\n{spec}\n\nSTUDENT SUBMISSION:\n{submission_text}"
            raw = await call_llm_json(system, quiz_msg)
            if "_parse_failed" not in raw:
                p = raw.get("questions", [])
                await save_quiz_pool(db, context_id, submission_text, p)
                return p, None
            return [], raw

        pool = await get_quiz_pool(db, context_id, submission_text)
        quiz_err = None
        if pool is None:
            pool, quiz_err = await _generate_quiz_pool()

        if pool:
            questions = await pick_from_pool(db, pool, num_questions, context_id, submission_text)
            if questions is None:
                pool, quiz_err = await _generate_quiz_pool()
                if pool:
                    questions = await pick_from_pool(db, pool, num_questions, context_id, submission_text)
            if questions:
                for q in questions:
                    q["formatted"] = f"Q{q['question_number']}: {q['question']}"
                result["quiz"] = {"questions": questions}
            else:
                result["quiz"] = quiz_err
        else:
            result["quiz"] = quiz_err

    # --- Summary ---
    if mode in ("summary", "both"):
        cached_summary = await get_cached_result(db, context_id, submission_text, "summary")
        if cached_summary is not None:
            summary = cached_summary
        else:
            summary_msg = f"ASSIGNMENT SPECIFICATION:\n{spec}\n\nSTUDENT SUBMISSION:\n{submission_text}"
            summary = await call_llm(SUMMARY_PROMPT, summary_msg)
            await save_result(db, context_id, submission_text, "summary", summary)
        result["summary"] = summary

    # Save submission record
    if student_id and class_id:
        try:
            stu = await get_student(db, student_id)
            await _save_sub(
                db, student_id=student_id, student_name=stu.get("name", ""),
                context_id=context_id, context_title=context.get("title", ""),
                class_id=class_id, result=result,
            )
        except Exception:
            pass

    return SubmitResponse(**result)

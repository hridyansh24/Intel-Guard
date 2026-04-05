from typing import Literal
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from backend.services.extractor import extract_text, extract_text_multi
from backend.services.context_store import load_context
from backend.services.llm import call_llm, call_llm_json
from backend.services.result_cache import get_cached_result, save_result, get_quiz_pool, save_quiz_pool, pick_from_pool
from backend.prompts import AI_DETECTION_SYSTEM_PROMPT, QUIZ_GENERATION_PROMPT, SUMMARY_PROMPT
from backend.schemas import SubmitResponse

router = APIRouter(prefix="/submit", tags=["submit"])


@router.post("/", response_model=SubmitResponse)
async def submit(
    context_id: str = Form(...),
    files: list[UploadFile] = File(..., description="Upload 1-10 submission files"),
    mode: Literal["quiz", "summary", "both"] = Form("quiz"),
    skip_detection: bool = Form(False),
    num_questions: int = Form(3),
):
    """Combined endpoint: extract -> (optional) detect -> quiz/summarize.

    Accepts up to 10 files. When skip_detection=True, skips the AI detection call entirely.
    """
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed.")
    context = load_context(context_id)
    if len(files) == 1:
        submission_text, file_type = await extract_text(files[0])
    else:
        submission_text, file_type = await extract_text_multi(files)

    spec = context["spec_text"]
    result = {
        "context_id": context_id,
        "extracted_text": submission_text,
        "file_type": file_type,
        "ai_detection": None,
        "quiz": None,
        "summary": None,
    }

    # --- AI Detection (skippable) ---
    if not skip_detection:
        cached_detect = get_cached_result(context_id, submission_text, "analyze")
        if cached_detect is not None:
            detection = cached_detect
        else:
            detect_msg = (
                f"ASSIGNMENT SPECIFICATION:\n{spec}\n\n"
                f"STUDENT SUBMISSION ({file_type}):\n{submission_text}"
            )
            detection = await call_llm_json(AI_DETECTION_SYSTEM_PROMPT, detect_msg)
            save_result(context_id, submission_text, "analyze", detection)
        result["ai_detection"] = detection

    # --- Quiz Generation (pool-based) ---
    if mode in ("quiz", "both"):
        pool_size = num_questions * 4

        async def _generate_quiz_pool():
            system = QUIZ_GENERATION_PROMPT.format(num_questions=pool_size)
            quiz_msg = (
                f"ASSIGNMENT SPECIFICATION:\n{spec}\n\n"
                f"STUDENT SUBMISSION:\n{submission_text}"
            )
            raw = await call_llm_json(system, quiz_msg)
            if "_parse_failed" not in raw:
                p = raw.get("questions", [])
                save_quiz_pool(context_id, submission_text, p)
                return p, None
            return [], raw

        pool = get_quiz_pool(context_id, submission_text)
        if pool is None:
            pool, quiz_err = await _generate_quiz_pool()

        if pool:
            questions = pick_from_pool(pool, num_questions, context_id, submission_text)
            if questions is None:
                # Pool exhausted — fresh batch
                pool, quiz_err = await _generate_quiz_pool()
                if pool:
                    questions = pick_from_pool(pool, num_questions, context_id, submission_text)
            if questions:
                for q in questions:
                    q["formatted"] = f"Q{q['question_number']}: {q['question']}"
                result["quiz"] = {"questions": questions}
            else:
                result["quiz"] = quiz_err
        else:
            result["quiz"] = quiz_err

    # --- Summary (primary model) ---
    if mode in ("summary", "both"):
        cached_summary = get_cached_result(context_id, submission_text, "summary")
        if cached_summary is not None:
            summary = cached_summary
        else:
            summary_msg = (
                f"ASSIGNMENT SPECIFICATION:\n{spec}\n\n"
                f"STUDENT SUBMISSION:\n{submission_text}"
            )
            summary = await call_llm(SUMMARY_PROMPT, summary_msg)
            save_result(context_id, submission_text, "summary", summary)
        result["summary"] = summary

    return SubmitResponse(**result)

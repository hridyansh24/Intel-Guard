from typing import Literal
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from backend.services.extractor import extract_text, extract_text_multi
from backend.services.context_store import load_context
from backend.services.llm import call_llm, call_llm_json
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
        detect_msg = (
            f"ASSIGNMENT SPECIFICATION:\n{spec}\n\n"
            f"STUDENT SUBMISSION ({file_type}):\n{submission_text}"
        )
        detection = await call_llm_json(AI_DETECTION_SYSTEM_PROMPT, detect_msg)
        result["ai_detection"] = detection

    # --- Quiz Generation (primary model) ---
    if mode in ("quiz", "both"):
        system = QUIZ_GENERATION_PROMPT.format(num_questions=num_questions)
        quiz_msg = (
            f"ASSIGNMENT SPECIFICATION:\n{spec}\n\n"
            f"STUDENT SUBMISSION:\n{submission_text}"
        )
        quiz = await call_llm_json(system, quiz_msg)
        # Add formatted questions for readability
        if "questions" in quiz:
            for q in quiz["questions"]:
                q["formatted"] = f"Q{q['question_number']}: {q['question']}"
        result["quiz"] = quiz

    # --- Summary (primary model) ---
    if mode in ("summary", "both"):
        summary_msg = (
            f"ASSIGNMENT SPECIFICATION:\n{spec}\n\n"
            f"STUDENT SUBMISSION:\n{submission_text}"
        )
        summary = await call_llm(SUMMARY_PROMPT, summary_msg)
        result["summary"] = summary

    return SubmitResponse(**result)

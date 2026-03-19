from fastapi import APIRouter, UploadFile, File, Form
from backend.services.extractor import extract_text
from backend.services.context_store import load_context
from backend.services.llm import call_llm
from backend.routers.analyze import AI_DETECTION_SYSTEM_PROMPT
from backend.schemas import SubmitResponse
import json

router = APIRouter(prefix="/submit", tags=["submit"])


@router.post("/", response_model=SubmitResponse)
async def submit(
    context_id: str = Form(...),
    file: UploadFile = File(...),
    mode: str = Form("quiz"),              # "quiz" | "summary" | "both"
    skip_detection: bool = Form(False),    # True = quiz-only mode, skip AI analysis
    num_questions: int = Form(3),
):
    """Combined endpoint: extract → (optional) detect → quiz/summarize.

    When skip_detection=True, skips the AI detection call entirely.
    This is the recommended mode when the instructor wants to quiz everyone
    regardless of AI suspicion — saves ~20% on LLM costs.
    """
    context = load_context(context_id)
    submission_text, file_type = await extract_text(file)

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
        raw = call_llm(AI_DETECTION_SYSTEM_PROMPT, detect_msg)
        try:
            detection = json.loads(raw)
        except json.JSONDecodeError:
            detection = {"ai_probability": -1, "assessment": raw}
        result["ai_detection"] = detection

    # --- Quiz Generation (primary model) ---
    if mode in ("quiz", "both"):
        from backend.routers.quiz import QUIZ_GENERATION_PROMPT
        system = QUIZ_GENERATION_PROMPT.format(num_questions=num_questions)
        quiz_msg = (
            f"ASSIGNMENT SPECIFICATION:\n{spec}\n\n"
            f"STUDENT SUBMISSION:\n{submission_text}"
        )
        raw = call_llm(system, quiz_msg)
        try:
            quiz = json.loads(raw)
        except json.JSONDecodeError:
            quiz = {"questions": [{"question": raw, "question_number": 1}]}
        result["quiz"] = quiz

    # --- Summary (primary model) ---
    if mode in ("summary", "both"):
        from backend.routers.summary import SUMMARY_PROMPT
        summary_msg = (
            f"ASSIGNMENT SPECIFICATION:\n{spec}\n\n"
            f"STUDENT SUBMISSION:\n{submission_text}"
        )
        summary = call_llm(SUMMARY_PROMPT, summary_msg)
        result["summary"] = summary

    return SubmitResponse(**result)

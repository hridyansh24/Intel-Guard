from fastapi import APIRouter
from backend.services.context_store import load_context
from backend.services.llm import call_llm_json
from backend.schemas import QuizResponse, QuizQuestion, EvaluateRequest, EvaluateResponse
from backend.prompts import QUIZ_GENERATION_PROMPT, EVALUATE_PROMPT

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(
    context_id: str,
    submission_text: str,
    num_questions: int = 3,
):
    """Generate comprehension check questions based on submission + assignment context."""
    context = load_context(context_id)

    system = QUIZ_GENERATION_PROMPT.format(num_questions=num_questions)
    user_message = (
        f"ASSIGNMENT SPECIFICATION:\n{context['spec_text']}\n\n"
        f"STUDENT SUBMISSION:\n{submission_text}"
    )

    result = await call_llm_json(system, user_message)

    if "_parse_failed" in result:
        questions = [QuizQuestion(question=result["_raw"], question_number=1)]
    else:
        questions = [QuizQuestion(**q) for q in result.get("questions", [])]

    return QuizResponse(context_id=context_id, questions=questions)


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_answer(req: EvaluateRequest):
    """Evaluate a student's answer to a comprehension check question."""
    context = load_context(req.context_id)

    user_message = (
        f"ASSIGNMENT SPECIFICATION:\n{context['spec_text']}\n\n"
        f"STUDENT SUBMISSION:\n{req.submission_text}\n\n"
        f"QUESTION:\n{req.question}\n\n"
        f"STUDENT'S ANSWER:\n{req.student_answer}"
    )

    result = await call_llm_json(EVALUATE_PROMPT, user_message, use_mini=True)

    return EvaluateResponse(
        passed=result.get("passed", False),
        score=result.get("score", 0.0),
        feedback=result.get("feedback", result.get("_raw", "Failed to parse LLM response.")),
    )

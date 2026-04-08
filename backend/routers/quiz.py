from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.services.context_store import load_context
from backend.services.llm import call_llm_json
from backend.services.result_cache import get_quiz_pool, save_quiz_pool, pick_from_pool
from backend.schemas import QuizResponse, QuizQuestion, EvaluateRequest, EvaluateResponse
from backend.prompts import QUIZ_GENERATION_PROMPT, EVALUATE_PROMPT

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(
    context_id: str,
    submission_text: str,
    num_questions: int = 3,
    db: AsyncSession = Depends(get_db),
):
    context = await load_context(db, context_id)
    pool_size = num_questions * 4

    async def _generate_pool():
        system = QUIZ_GENERATION_PROMPT.format(num_questions=pool_size)
        user_message = (
            f"ASSIGNMENT SPECIFICATION:\n{context['spec_text']}\n\n"
            f"STUDENT SUBMISSION:\n{submission_text}"
        )
        result = await call_llm_json(system, user_message)
        if "_parse_failed" in result:
            return None, result
        pool = result.get("questions", [])
        await save_quiz_pool(db, context_id, submission_text, pool)
        return pool, None

    pool = await get_quiz_pool(db, context_id, submission_text)
    if pool is None:
        pool, err = await _generate_pool()
        if err:
            return QuizResponse(
                context_id=context_id,
                questions=[QuizQuestion(question=err["_raw"], question_number=1)],
            )

    questions = await pick_from_pool(db, pool, num_questions, context_id, submission_text)
    if questions is None:
        pool, err = await _generate_pool()
        if err:
            return QuizResponse(
                context_id=context_id,
                questions=[QuizQuestion(question=err["_raw"], question_number=1)],
            )
        questions = await pick_from_pool(db, pool, num_questions, context_id, submission_text)

    return QuizResponse(
        context_id=context_id,
        questions=[QuizQuestion(**q) for q in questions],
    )


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_answer(req: EvaluateRequest, db: AsyncSession = Depends(get_db)):
    context = await load_context(db, req.context_id)

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

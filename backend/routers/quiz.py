from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.services.context_store import load_context
from backend.services.llm import call_llm_json
from backend.services.result_cache import get_quiz_pool, save_quiz_pool, pick_from_pool
from backend.schemas import QuizResponse, QuizQuestion, EvaluateRequest, EvaluateResponse
from backend.prompts import QUIZ_GENERATION_PROMPT

router = APIRouter(prefix="/quiz", tags=["quiz"])


def _strip_answers(q: dict) -> dict:
    """Remove correct_index and explanations before sending to the client."""
    return {
        "question": q.get("question", ""),
        "options": q.get("options", []),
        "question_number": q.get("question_number", 0),
    }


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
                questions=[QuizQuestion(question=err["_raw"], options=[], question_number=1)],
            )

    questions = await pick_from_pool(db, pool, num_questions, context_id, submission_text)
    if questions is None:
        pool, err = await _generate_pool()
        if err:
            return QuizResponse(
                context_id=context_id,
                questions=[QuizQuestion(question=err["_raw"], options=[], question_number=1)],
            )
        questions = await pick_from_pool(db, pool, num_questions, context_id, submission_text)

    return QuizResponse(
        context_id=context_id,
        questions=[QuizQuestion(**_strip_answers(q)) for q in questions],
    )


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_answer(req: EvaluateRequest, db: AsyncSession = Depends(get_db)):
    """Deterministic MCQ grading — looks up the question in the stored pool by text match."""
    pool = await get_quiz_pool(db, req.context_id, req.submission_text)
    if not pool:
        raise HTTPException(status_code=404, detail="Quiz pool not found. Generate the quiz first.")

    match = next((q for q in pool if q.get("question", "").strip() == req.question.strip()), None)
    if not match:
        raise HTTPException(status_code=404, detail="Question not found in quiz pool.")

    correct_index = int(match.get("correct_index", -1))
    explanations = match.get("explanations", []) or []
    options = match.get("options", []) or []
    chosen = req.chosen_index
    passed = (chosen == correct_index)

    if 0 <= chosen < len(explanations):
        chosen_explanation = explanations[chosen]
    else:
        chosen_explanation = ""
    correct_explanation = explanations[correct_index] if 0 <= correct_index < len(explanations) else ""

    if passed:
        feedback = f"Correct. {correct_explanation}".strip()
    else:
        chosen_text = options[chosen] if 0 <= chosen < len(options) else "your choice"
        correct_text = options[correct_index] if 0 <= correct_index < len(options) else "the correct option"
        feedback = (
            f'Your answer "{chosen_text}" is incorrect. {chosen_explanation}\n\n'
            f'The correct answer is "{correct_text}". {correct_explanation}'
        ).strip()

    return EvaluateResponse(
        passed=passed,
        score=1.0 if passed else 0.0,
        feedback=feedback,
        correct_index=correct_index,
        chosen_index=chosen,
    )

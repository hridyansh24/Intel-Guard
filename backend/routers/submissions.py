from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.services.submission_store import get_submission, list_submissions, update_submission_quiz

router = APIRouter(prefix="/submissions", tags=["submissions"])


class QuizResultUpdate(BaseModel):
    passed: int
    total: int
    score: float
    evaluations: list[dict]


@router.get("/")
async def get_all_submissions(
    class_id: str = None, student_id: str = None, context_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    return await list_submissions(db, class_id=class_id, student_id=student_id, context_id=context_id)


@router.get("/{submission_id}")
async def get_one_submission(submission_id: str, db: AsyncSession = Depends(get_db)):
    return await get_submission(db, submission_id)


@router.patch("/{submission_id}/quiz")
async def update_quiz_results(submission_id: str, req: QuizResultUpdate, db: AsyncSession = Depends(get_db)):
    return await update_submission_quiz(db, submission_id, req.model_dump())

import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from backend.models import Submission


async def save_submission(
    db: AsyncSession,
    student_id: str,
    student_name: str,
    context_id: str,
    context_title: str,
    class_id: str,
    result: dict,
) -> dict:
    submission_id = str(uuid.uuid4())[:8]
    sub = Submission(
        id=submission_id,
        student_id=student_id,
        student_name=student_name,
        context_id=context_id,
        context_title=context_title,
        class_id=class_id,
        ai_detection=result.get("ai_detection"),
        style_analysis=result.get("style_analysis"),
        confidence_score=result.get("confidence_score"),
    )
    db.add(sub)
    await db.commit()
    return _serialize(sub)


async def update_submission_quiz(db: AsyncSession, submission_id: str, quiz_results: dict) -> dict:
    sub = await db.get(Submission, submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission not found: {submission_id}")
    sub.quiz_results = quiz_results
    await db.commit()
    return _serialize(sub)


async def get_submission(db: AsyncSession, submission_id: str) -> dict:
    sub = await db.get(Submission, submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission not found: {submission_id}")
    return _serialize(sub)


async def list_submissions(
    db: AsyncSession,
    class_id: str = None,
    student_id: str = None,
    context_id: str = None,
) -> list[dict]:
    q = select(Submission)
    if class_id:
        q = q.where(Submission.class_id == class_id)
    if student_id:
        q = q.where(Submission.student_id == student_id)
    if context_id:
        q = q.where(Submission.context_id == context_id)
    q = q.order_by(Submission.timestamp.desc())
    result = await db.execute(q)
    return [_serialize(s) for s in result.scalars()]


def _serialize(sub: Submission) -> dict:
    return {
        "submission_id": sub.id,
        "student_id": sub.student_id,
        "student_name": sub.student_name,
        "context_id": sub.context_id,
        "context_title": sub.context_title,
        "class_id": sub.class_id,
        "timestamp": sub.timestamp.isoformat() if sub.timestamp else None,
        "ai_detection": sub.ai_detection,
        "style_analysis": sub.style_analysis,
        "confidence_score": sub.confidence_score,
        "quiz_results": sub.quiz_results,
    }

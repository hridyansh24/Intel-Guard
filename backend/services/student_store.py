import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from backend.models import Student


async def register_student(db: AsyncSession, name: str) -> dict:
    student_id = str(uuid.uuid4())[:8]
    student = Student(id=student_id, name=name)
    db.add(student)
    await db.commit()
    return {"student_id": student_id, "name": name}


async def get_student(db: AsyncSession, student_id: str) -> dict:
    result = await db.get(Student, student_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Student not found: {student_id}")
    return {"student_id": result.id, "name": result.name}


async def list_students(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(Student))
    return [{"student_id": s.id, "name": s.name} for s in result.scalars()]

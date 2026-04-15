import uuid
import hashlib
import secrets
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from backend.models import Student


def _hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()


async def register_student(db: AsyncSession, name: str, password: str) -> dict:
    student_id = str(uuid.uuid4())[:8]
    salt = secrets.token_hex(16)
    student = Student(
        id=student_id,
        name=name,
        password_salt=salt,
        password_hash=_hash_password(password, salt),
    )
    db.add(student)
    await db.commit()
    return {"student_id": student_id, "name": name}


async def login_student(db: AsyncSession, student_id: str, password: str) -> dict:
    student = await db.get(Student, student_id)
    if not student or not student.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if _hash_password(password, student.password_salt) != student.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"student_id": student.id, "name": student.name}


async def get_student(db: AsyncSession, student_id: str) -> dict:
    result = await db.get(Student, student_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Student not found: {student_id}")
    return {"student_id": result.id, "name": result.name}


async def list_students(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(Student))
    return [{"student_id": s.id, "name": s.name} for s in result.scalars()]

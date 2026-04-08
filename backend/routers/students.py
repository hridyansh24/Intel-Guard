from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.services.student_store import register_student, get_student, list_students

router = APIRouter(prefix="/students", tags=["students"])


class RegisterRequest(BaseModel):
    name: str


@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required.")
    return await register_student(db, req.name.strip())


@router.get("/")
async def get_all_students(db: AsyncSession = Depends(get_db)):
    return await list_students(db)


@router.get("/{student_id}")
async def get_one_student(student_id: str, db: AsyncSession = Depends(get_db)):
    return await get_student(db, student_id)

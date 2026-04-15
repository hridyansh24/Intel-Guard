from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.services.student_store import (
    register_student, login_student, get_student, list_students,
)

router = APIRouter(prefix="/students", tags=["students"])


class RegisterRequest(BaseModel):
    name: str
    password: str


class LoginRequest(BaseModel):
    student_id: str
    password: str


@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required.")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters.")
    return await register_student(db, req.name.strip(), req.password)


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await login_student(db, req.student_id.strip(), req.password)


@router.get("/")
async def get_all_students(db: AsyncSession = Depends(get_db)):
    return await list_students(db)


@router.get("/{student_id}")
async def get_one_student(student_id: str, db: AsyncSession = Depends(get_db)):
    return await get_student(db, student_id)

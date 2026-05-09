from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.services.professor_store import (
    register_professor, login_professor, get_professor, list_professors,
)

router = APIRouter(prefix="/professors", tags=["professors"])


class RegisterRequest(BaseModel):
    name: str
    password: str


class LoginRequest(BaseModel):
    professor_id: str
    password: str


@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required.")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters.")
    return await register_professor(db, req.name.strip(), req.password)


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await login_professor(db, req.professor_id.strip(), req.password)


@router.get("/")
async def get_all_professors(db: AsyncSession = Depends(get_db)):
    return await list_professors(db)


@router.get("/{professor_id}")
async def get_one_professor(professor_id: str, db: AsyncSession = Depends(get_db)):
    return await get_professor(db, professor_id)

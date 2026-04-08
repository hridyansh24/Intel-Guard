from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.services.class_store import (
    create_class, get_class, list_classes, join_class,
    add_context_to_class, get_classes_for_student,
    update_context_settings, get_context_settings,
)
from backend.services.student_store import get_student
from backend.services.submission_store import list_submissions

router = APIRouter(prefix="/classes", tags=["classes"])


class CreateClassRequest(BaseModel):
    name: str


class JoinClassRequest(BaseModel):
    student_id: str


class AddContextRequest(BaseModel):
    context_id: str
    skip_detection: bool = False


class UpdateContextSettingsRequest(BaseModel):
    skip_detection: bool


@router.post("/")
async def create_new_class(req: CreateClassRequest, db: AsyncSession = Depends(get_db)):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Class name is required.")
    return await create_class(db, req.name.strip())


@router.get("/")
async def get_all_classes(db: AsyncSession = Depends(get_db)):
    return await list_classes(db)


@router.get("/{class_id}")
async def get_one_class(class_id: str, db: AsyncSession = Depends(get_db)):
    return await get_class(db, class_id)


@router.post("/{class_id}/join")
async def join_existing_class(class_id: str, req: JoinClassRequest, db: AsyncSession = Depends(get_db)):
    await get_student(db, req.student_id)
    return await join_class(db, class_id, req.student_id)


@router.post("/{class_id}/context")
async def link_context_to_class(class_id: str, req: AddContextRequest, db: AsyncSession = Depends(get_db)):
    return await add_context_to_class(db, class_id, req.context_id, req.skip_detection)


@router.patch("/{class_id}/context/{context_id}")
async def update_class_context_settings(
    class_id: str, context_id: str, req: UpdateContextSettingsRequest,
    db: AsyncSession = Depends(get_db),
):
    return await update_context_settings(db, class_id, context_id, req.skip_detection)


@router.get("/{class_id}/context/{context_id}/settings")
async def get_class_context_settings(class_id: str, context_id: str, db: AsyncSession = Depends(get_db)):
    return await get_context_settings(db, class_id, context_id)


@router.get("/{class_id}/students")
async def get_class_students(class_id: str, db: AsyncSession = Depends(get_db)):
    cls = await get_class(db, class_id)
    students = []
    for sid in cls.get("students", []):
        try:
            students.append(await get_student(db, sid))
        except Exception:
            continue
    return students


@router.get("/{class_id}/submissions")
async def get_class_submissions(class_id: str, context_id: str = None, db: AsyncSession = Depends(get_db)):
    return await list_submissions(db, class_id=class_id, context_id=context_id)


@router.get("/student/{student_id}")
async def get_student_classes(student_id: str, db: AsyncSession = Depends(get_db)):
    return await get_classes_for_student(db, student_id)

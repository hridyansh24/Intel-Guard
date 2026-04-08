import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from backend.models import Class, ClassContext, class_students, Student


async def create_class(db: AsyncSession, name: str) -> dict:
    class_id = str(uuid.uuid4())[:8]
    cls = Class(id=class_id, name=name)
    db.add(cls)
    await db.commit()
    # Return directly — new class has no students or contexts yet
    return {"class_id": class_id, "name": name, "students": [], "contexts": []}


async def get_class(db: AsyncSession, class_id: str) -> dict:
    result = await db.execute(
        select(Class)
        .options(selectinload(Class.students), selectinload(Class.context_links))
        .where(Class.id == class_id)
    )
    cls = result.scalar_one_or_none()
    if not cls:
        raise HTTPException(status_code=404, detail=f"Class not found: {class_id}")
    return _serialize(cls)


async def list_classes(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(Class).options(selectinload(Class.students), selectinload(Class.context_links))
    )
    return [_serialize(c) for c in result.scalars()]


async def join_class(db: AsyncSession, class_id: str, student_id: str) -> dict:
    cls = await db.get(Class, class_id)
    if not cls:
        raise HTTPException(status_code=404, detail=f"Class not found: {class_id}")
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail=f"Student not found: {student_id}")

    # Check if already joined
    existing = await db.execute(
        select(class_students)
        .where(class_students.c.class_id == class_id, class_students.c.student_id == student_id)
    )
    if not existing.first():
        await db.execute(class_students.insert().values(class_id=class_id, student_id=student_id))
        await db.commit()

    return await get_class(db, class_id)


async def add_context_to_class(db: AsyncSession, class_id: str, context_id: str, skip_detection: bool = False) -> dict:
    existing = await db.execute(
        select(ClassContext).where(ClassContext.class_id == class_id, ClassContext.context_id == context_id)
    )
    if not existing.scalar_one_or_none():
        db.add(ClassContext(class_id=class_id, context_id=context_id, skip_detection=skip_detection))
        await db.commit()
    return await get_class(db, class_id)


async def update_context_settings(db: AsyncSession, class_id: str, context_id: str, skip_detection: bool) -> dict:
    result = await db.execute(
        select(ClassContext).where(ClassContext.class_id == class_id, ClassContext.context_id == context_id)
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Assignment not linked to this class.")
    link.skip_detection = skip_detection
    await db.commit()
    return await get_class(db, class_id)


async def get_context_settings(db: AsyncSession, class_id: str, context_id: str) -> dict:
    result = await db.execute(
        select(ClassContext).where(ClassContext.class_id == class_id, ClassContext.context_id == context_id)
    )
    link = result.scalar_one_or_none()
    if not link:
        return {"context_id": context_id, "skip_detection": False}
    return {"context_id": link.context_id, "skip_detection": link.skip_detection}


async def get_classes_for_student(db: AsyncSession, student_id: str) -> list[dict]:
    result = await db.execute(
        select(Class)
        .join(class_students)
        .where(class_students.c.student_id == student_id)
        .options(selectinload(Class.students), selectinload(Class.context_links))
    )
    return [_serialize(c) for c in result.scalars()]


def _serialize(cls: Class) -> dict:
    return {
        "class_id": cls.id,
        "name": cls.name,
        "students": [s.id for s in cls.students] if cls.students else [],
        "contexts": [
            {"context_id": link.context_id, "skip_detection": link.skip_detection}
            for link in cls.context_links
        ] if cls.context_links else [],
    }

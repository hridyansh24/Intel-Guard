import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from backend.models import Context


async def save_context(db: AsyncSession, title: str, spec_text: str) -> str:
    context_id = str(uuid.uuid4())[:8]
    ctx = Context(id=context_id, title=title, spec_text=spec_text)
    db.add(ctx)
    await db.commit()
    return context_id


async def load_context(db: AsyncSession, context_id: str) -> dict:
    result = await db.get(Context, context_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"No context found for id: {context_id}")
    return {"context_id": result.id, "title": result.title, "spec_text": result.spec_text}


async def list_contexts(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(Context).order_by(Context.created_at.desc()))
    return [{"context_id": c.id, "title": c.title} for c in result.scalars()]

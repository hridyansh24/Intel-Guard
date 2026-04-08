from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.services.context_store import save_context, load_context, list_contexts
from backend.services.extractor import extract_text, extract_text_multi
from backend.schemas import ContextResponse

router = APIRouter(prefix="/context", tags=["context"])


@router.post("/", response_model=ContextResponse)
async def upload_context(
    title: str = Form(...),
    files: list[UploadFile] = File(..., description="Upload 1-10 assignment spec files"),
    db: AsyncSession = Depends(get_db),
):
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed.")
    if len(files) == 1:
        spec_text, _ = await extract_text(files[0], db)
    else:
        spec_text, _ = await extract_text_multi(files, db)
    context_id = await save_context(db, title, spec_text)
    return ContextResponse(
        context_id=context_id, title=title,
        message=f"Context stored successfully. {len(files)} file(s) processed.",
    )


@router.get("/")
async def get_all_contexts(db: AsyncSession = Depends(get_db)):
    return await list_contexts(db)


@router.get("/{context_id}")
async def get_context(context_id: str, db: AsyncSession = Depends(get_db)):
    return await load_context(db, context_id)

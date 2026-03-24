from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from backend.services.context_store import save_context, load_context, list_contexts
from backend.services.extractor import extract_text, extract_text_multi
from backend.schemas import ContextResponse

router = APIRouter(prefix="/context", tags=["context"])


@router.post("/", response_model=ContextResponse)
async def upload_context(
    title: str = Form(...),
    files: list[UploadFile] = File(..., description="Upload 1-10 assignment spec files"),
):
    """Upload assignment spec files (PDF, code, or text) to create a context. Accepts up to 10 files."""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed.")
    if len(files) == 1:
        spec_text, _ = await extract_text(files[0])
    else:
        spec_text, _ = await extract_text_multi(files)
    context_id = save_context(title, spec_text)
    return ContextResponse(
        context_id=context_id,
        title=title,
        message=f"Context stored successfully. {len(files)} file(s) processed.",
    )


@router.get("/")
async def get_all_contexts():
    """List all stored contexts."""
    return list_contexts()


@router.get("/{context_id}")
async def get_context(context_id: str):
    """Get a specific context by ID."""
    return load_context(context_id)

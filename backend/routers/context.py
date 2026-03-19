from fastapi import APIRouter, UploadFile, File, Form
from backend.services.context_store import save_context, load_context, list_contexts
from backend.services.extractor import extract_text
from backend.schemas import ContextResponse

router = APIRouter(prefix="/context", tags=["context"])


@router.post("/", response_model=ContextResponse)
async def upload_context(
    title: str = Form(...),
    file: UploadFile = File(...),
):
    """Upload an assignment spec (PDF, code, or text) to create a context."""
    spec_text, _ = await extract_text(file)
    context_id = save_context(title, spec_text)
    return ContextResponse(
        context_id=context_id,
        title=title,
        message="Context stored successfully.",
    )


@router.get("/")
async def get_all_contexts():
    """List all stored contexts."""
    return list_contexts()


@router.get("/{context_id}")
async def get_context(context_id: str):
    """Get a specific context by ID."""
    return load_context(context_id)

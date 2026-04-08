import pdfplumber
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from backend.services.submission_cache import get_cached, save_to_cache
import io

CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".java", ".cpp", ".c", ".cs", ".go",
    ".rs", ".rb", ".php", ".swift", ".kt", ".r", ".m", ".sh",
    ".html", ".css", ".sql", ".json", ".xml", ".yaml", ".yml",
}

def get_file_type(filename: str) -> str:
    suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if suffix == ".pdf":
        return "pdf"
    elif suffix in CODE_EXTENSIONS:
        return "code"
    else:
        return "text"

async def extract_text(file: UploadFile, db: AsyncSession) -> tuple[str, str]:
    """Returns (extracted_text, file_type). Uses cache to skip re-extraction on retries."""
    content = await file.read()

    # Check cache first — same file uploaded again skips extraction
    cached = await get_cached(db, content)
    if cached:
        return cached["extracted_text"], cached["file_type"]

    file_type = get_file_type(file.filename)

    if file_type == "pdf":
        text = _extract_pdf(content)
    else:
        text = content.decode("utf-8", errors="replace")

    text = text.strip()
    await save_to_cache(db, content, text, file_type)
    return text, file_type


async def extract_text_multi(files: list[UploadFile], db: AsyncSession) -> tuple[str, str]:
    """Extract and concatenate text from multiple files (up to 10).
    Returns (combined_text, file_types_summary)."""
    all_texts = []
    file_types = []
    for f in files:
        text, ftype = await extract_text(f, db)
        all_texts.append(f"--- {f.filename} ---\n{text}")
        file_types.append(ftype)
    combined = "\n\n".join(all_texts)
    types_summary = ", ".join(dict.fromkeys(file_types))  # unique types, preserve order
    return combined, types_summary


def _extract_pdf(content: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)

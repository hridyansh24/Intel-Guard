import pdfplumber
from fastapi import UploadFile
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

async def extract_text(file: UploadFile) -> tuple[str, str]:
    """Returns (extracted_text, file_type). Uses cache to skip re-extraction on retries."""
    content = await file.read()

    # Check cache first — same file uploaded again skips extraction
    cached = get_cached(content)
    if cached:
        return cached["extracted_text"], cached["file_type"]

    file_type = get_file_type(file.filename)

    if file_type == "pdf":
        text = _extract_pdf(content)
    else:
        text = content.decode("utf-8", errors="replace")

    text = text.strip()
    save_to_cache(content, text, file_type)
    return text, file_type


def _extract_pdf(content: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)

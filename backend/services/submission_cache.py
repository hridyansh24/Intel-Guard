import hashlib
import json
import os
import re
from backend.config import settings

_SAFE_HASH = re.compile(r"^[a-f0-9]+$")


def _cache_dir() -> str:
    os.makedirs(settings.submission_cache_dir, exist_ok=True)
    return settings.submission_cache_dir


def _hash_content(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()[:16]


def get_cached(content: bytes) -> dict | None:
    """Check if we already extracted text from this exact file."""
    cache_id = _hash_content(content)
    path = os.path.join(_cache_dir(), f"{cache_id}.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return None


def save_to_cache(content: bytes, extracted_text: str, file_type: str) -> str:
    """Cache extracted text. Returns the cache_id."""
    cache_id = _hash_content(content)
    path = os.path.join(_cache_dir(), f"{cache_id}.json")
    with open(path, "w") as f:
        json.dump({
            "cache_id": cache_id,
            "extracted_text": extracted_text,
            "file_type": file_type,
        }, f)
    return cache_id

import hashlib
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import SubmissionCache


def _hash_content(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()[:16]


async def get_cached(db: AsyncSession, content: bytes) -> dict | None:
    cache_id = _hash_content(content)
    result = await db.get(SubmissionCache, cache_id)
    if result:
        return {
            "cache_id": result.content_hash,
            "extracted_text": result.extracted_text,
            "file_type": result.file_type,
        }
    return None


async def save_to_cache(db: AsyncSession, content: bytes, extracted_text: str, file_type: str) -> str:
    cache_id = _hash_content(content)
    existing = await db.get(SubmissionCache, cache_id)
    if not existing:
        db.add(SubmissionCache(content_hash=cache_id, extracted_text=extracted_text, file_type=file_type))
        await db.commit()
    return cache_id

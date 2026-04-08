import hashlib
import random
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import ResultCache, QuizPool


def _make_key(context_id: str, submission_text: str, operation: str) -> str:
    raw = f"{context_id}|{submission_text}|{operation}"
    return hashlib.sha256(raw.encode()).hexdigest()[:24]


async def get_cached_result(db: AsyncSession, context_id: str, submission_text: str, operation: str):
    key = _make_key(context_id, submission_text, operation)
    result = await db.get(ResultCache, key)
    if result:
        return result.result
    return None


async def save_result(db: AsyncSession, context_id: str, submission_text: str, operation: str, result) -> None:
    key = _make_key(context_id, submission_text, operation)
    existing = await db.get(ResultCache, key)
    if existing:
        existing.result = result
    else:
        db.add(ResultCache(cache_key=key, context_id=context_id, operation=operation, result=result))
    await db.commit()


# --- Quiz pool helpers ---

def _pool_key(context_id: str, submission_text: str) -> str:
    return _make_key(context_id, submission_text, "quiz_pool")


async def get_quiz_pool(db: AsyncSession, context_id: str, submission_text: str) -> list[dict] | None:
    key = _pool_key(context_id, submission_text)
    result = await db.get(QuizPool, key)
    if result:
        return result.pool
    return None


async def save_quiz_pool(db: AsyncSession, context_id: str, submission_text: str, pool: list[dict]) -> None:
    key = _pool_key(context_id, submission_text)
    existing = await db.get(QuizPool, key)
    if existing:
        existing.pool = pool
        existing.served_indices = []
    else:
        db.add(QuizPool(cache_key=key, context_id=context_id, pool=pool, served_indices=[]))
    await db.commit()


async def pick_from_pool(
    db: AsyncSession, pool: list[dict], num_questions: int, context_id: str, submission_text: str,
) -> list[dict] | None:
    key = _pool_key(context_id, submission_text)
    record = await db.get(QuizPool, key)
    if not record:
        return None

    served = set(record.served_indices or [])
    remaining = [i for i in range(len(pool)) if i not in served]

    if len(remaining) < num_questions:
        await db.delete(record)
        await db.commit()
        return None

    chosen = random.sample(remaining, num_questions)
    served.update(chosen)
    record.served_indices = list(served)
    await db.commit()

    pick = [pool[i].copy() for i in chosen]
    for i, q in enumerate(pick, 1):
        q["question_number"] = i
    return pick

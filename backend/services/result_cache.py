import hashlib
import json
import os
import random
from backend.config import settings


def _cache_dir() -> str:
    os.makedirs(settings.result_cache_dir, exist_ok=True)
    return settings.result_cache_dir


def _make_key(context_id: str, submission_text: str, operation: str) -> str:
    """Cache key = hash(context_id + submission_text + operation).

    operation is one of: "analyze", "quiz_pool", "summary"
    """
    raw = f"{context_id}|{submission_text}|{operation}"
    return hashlib.sha256(raw.encode()).hexdigest()[:24]


def get_cached_result(context_id: str, submission_text: str, operation: str) -> dict | str | None:
    """Return cached LLM result if it exists, else None."""
    key = _make_key(context_id, submission_text, operation)
    path = os.path.join(_cache_dir(), f"{key}.json")
    if os.path.exists(path):
        with open(path) as f:
            data = json.load(f)
        return data.get("result")
    return None


def save_result(context_id: str, submission_text: str, operation: str, result) -> None:
    """Cache an LLM result (dict or string)."""
    key = _make_key(context_id, submission_text, operation)
    path = os.path.join(_cache_dir(), f"{key}.json")
    with open(path, "w") as f:
        json.dump({
            "context_id": context_id,
            "operation": operation,
            "result": result,
        }, f)


# --- Quiz pool helpers ---

def _quiz_pool_path(context_id: str, submission_text: str) -> str:
    key = _make_key(context_id, submission_text, "quiz_pool")
    return os.path.join(_cache_dir(), f"{key}.json")


def get_quiz_pool(context_id: str, submission_text: str) -> list[dict] | None:
    """Return the full cached question pool, or None if exhausted or not yet generated."""
    path = _quiz_pool_path(context_id, submission_text)
    if os.path.exists(path):
        with open(path) as f:
            data = json.load(f)
        return data.get("pool")
    return None


def save_quiz_pool(context_id: str, submission_text: str, pool: list[dict]) -> None:
    """Save a question pool to cache with empty served tracking."""
    path = _quiz_pool_path(context_id, submission_text)
    with open(path, "w") as f:
        json.dump({
            "context_id": context_id,
            "operation": "quiz_pool",
            "pool": pool,
            "served_indices": [],
        }, f)


def pick_from_pool(pool: list[dict], num_questions: int, context_id: str, submission_text: str) -> list[dict] | None:
    """Pick num_questions random questions that haven't been served yet.

    Returns None if the pool is exhausted (all questions served),
    signaling the caller to generate a fresh pool.
    """
    path = _quiz_pool_path(context_id, submission_text)
    with open(path) as f:
        data = json.load(f)
    served = set(data.get("served_indices", []))
    remaining = [i for i in range(len(pool)) if i not in served]

    if len(remaining) < num_questions:
        # Pool exhausted — delete cache so a fresh one gets generated
        os.remove(path)
        return None

    chosen = random.sample(remaining, num_questions)
    served.update(chosen)

    # Persist updated served list
    data["served_indices"] = list(served)
    with open(path, "w") as f:
        json.dump(data, f)

    pick = [pool[i].copy() for i in chosen]
    for i, q in enumerate(pick, 1):
        q["question_number"] = i
    return pick

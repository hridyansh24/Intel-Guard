import json
import re
import uuid
import os
from fastapi import HTTPException
from backend.config import settings

_SAFE_ID = re.compile(r"^[a-f0-9\-]+$")


def _validate_id(context_id: str) -> None:
    if not _SAFE_ID.match(context_id):
        raise HTTPException(status_code=400, detail="Invalid context_id format.")


def _store_dir() -> str:
    os.makedirs(settings.context_store_dir, exist_ok=True)
    return settings.context_store_dir


def save_context(title: str, spec_text: str) -> str:
    context_id = str(uuid.uuid4())[:8]
    path = os.path.join(_store_dir(), f"{context_id}.json")
    with open(path, "w") as f:
        json.dump({"context_id": context_id, "title": title, "spec_text": spec_text}, f)
    return context_id


def load_context(context_id: str) -> dict:
    _validate_id(context_id)
    path = os.path.join(_store_dir(), f"{context_id}.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"No context found for id: {context_id}")
    with open(path) as f:
        return json.load(f)


def list_contexts() -> list[dict]:
    store_dir = _store_dir()
    contexts = []
    for fname in os.listdir(store_dir):
        if fname.endswith(".json"):
            with open(os.path.join(store_dir, fname)) as f:
                data = json.load(f)
                contexts.append({"context_id": data["context_id"], "title": data["title"]})
    return contexts

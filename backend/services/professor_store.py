"""Professor account storage. Demo-grade auth — same hashing scheme as students.

Uses a full UUID for ids (not the truncated 8-char form used elsewhere) so a
single deployment can grow without collision risk on this new table.
"""

import uuid
import hashlib
import secrets
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from backend.models import Professor


def _hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()


async def register_professor(db: AsyncSession, name: str, password: str) -> dict:
    professor_id = str(uuid.uuid4())
    salt = secrets.token_hex(16)
    professor = Professor(
        id=professor_id,
        name=name,
        password_salt=salt,
        password_hash=_hash_password(password, salt),
    )
    db.add(professor)
    await db.commit()
    return {"professor_id": professor_id, "name": name}


async def login_professor(db: AsyncSession, professor_id: str, password: str) -> dict:
    professor = await db.get(Professor, professor_id)
    if not professor or not professor.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if _hash_password(password, professor.password_salt) != professor.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"professor_id": professor.id, "name": professor.name}


async def get_professor(db: AsyncSession, professor_id: str) -> dict:
    result = await db.get(Professor, professor_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Professor not found: {professor_id}")
    return {"professor_id": result.id, "name": result.name}


async def list_professors(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(Professor))
    return [{"professor_id": p.id, "name": p.name} for p in result.scalars()]

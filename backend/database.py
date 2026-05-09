from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from backend.config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency — yields an async session."""
    async with async_session() as session:
        yield session


# Lightweight in-place migrations for columns added after the initial schema.
# `create_all` only creates missing tables — it never alters existing ones —
# so any column added later needs an explicit ADD COLUMN IF NOT EXISTS here.
_LIGHT_MIGRATIONS = [
    "ALTER TABLE class_contexts ADD COLUMN IF NOT EXISTS mode VARCHAR DEFAULT 'quiz' NOT NULL",
    "ALTER TABLE class_contexts ADD COLUMN IF NOT EXISTS num_questions INTEGER DEFAULT 10 NOT NULL",
]


async def init_db():
    """Create all tables and apply lightweight migrations. Called once on startup."""
    async with engine.begin() as conn:
        from backend import models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
        for stmt in _LIGHT_MIGRATIONS:
            await conn.execute(text(stmt))

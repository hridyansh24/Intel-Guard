from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.services.context_store import load_context
from backend.services.llm import call_llm
from backend.services.result_cache import get_cached_result, save_result
from backend.schemas import SummaryResponse
from backend.prompts import SUMMARY_PROMPT

router = APIRouter(prefix="/summary", tags=["summary"])


@router.post("/", response_model=SummaryResponse)
async def summarize_submission(
    context_id: str,
    submission_text: str,
    db: AsyncSession = Depends(get_db),
):
    context = await load_context(db, context_id)

    cached = await get_cached_result(db, context_id, submission_text, "summary")
    if cached is not None:
        summary = cached
    else:
        user_message = (
            f"ASSIGNMENT SPECIFICATION:\n{context['spec_text']}\n\n"
            f"STUDENT SUBMISSION:\n{submission_text}"
        )
        summary = await call_llm(SUMMARY_PROMPT, user_message)
        await save_result(db, context_id, submission_text, "summary", summary)

    return SummaryResponse(context_id=context_id, summary=summary)

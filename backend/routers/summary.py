from fastapi import APIRouter
from backend.services.context_store import load_context
from backend.services.llm import call_llm
from backend.schemas import SummaryResponse
from backend.prompts import SUMMARY_PROMPT

router = APIRouter(prefix="/summary", tags=["summary"])


@router.post("/", response_model=SummaryResponse)
async def summarize_submission(
    context_id: str,
    submission_text: str,
):
    """Generate a comprehension-focused summary of the submission."""
    context = load_context(context_id)

    user_message = (
        f"ASSIGNMENT SPECIFICATION:\n{context['spec_text']}\n\n"
        f"STUDENT SUBMISSION:\n{submission_text}"
    )

    summary = await call_llm(SUMMARY_PROMPT, user_message)

    return SummaryResponse(context_id=context_id, summary=summary)

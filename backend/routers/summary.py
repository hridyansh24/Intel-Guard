from fastapi import APIRouter
from backend.services.context_store import load_context
from backend.services.llm import call_llm
from backend.schemas import SummaryResponse

router = APIRouter(prefix="/summary", tags=["summary"])

SUMMARY_PROMPT = """You are an academic assistant creating a comprehension-focused summary. Your goal is to help a student understand the work they submitted by breaking it down clearly.

You will receive:
1. The ASSIGNMENT SPECIFICATION — the original task context.
2. The STUDENT SUBMISSION — what the student submitted.

Create a summary that:
- Explains what the submission does/argues in plain language
- Maps it back to the assignment requirements (what was asked vs what was delivered)
- For code: explain the logic flow, key functions, and design choices
- For essays: outline the thesis, argument structure, and evidence used
- Highlight any gaps or areas where the submission doesn't fully address the spec
- Use language appropriate for the student's level

The student should NOT be able to just scroll past this — it should require engagement to follow. Structure it as a walkthrough, and keep the tone student friendly, not super sophesticated"""


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

    summary = call_llm(SUMMARY_PROMPT, user_message)

    return SummaryResponse(context_id=context_id, summary=summary)

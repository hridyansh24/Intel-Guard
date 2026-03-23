import traceback
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
from backend.services.extractor import extract_text
from backend.services.context_store import load_context
from backend.services.llm import call_llm_json
from backend.schemas import AnalyzeResponse
from backend.prompts import AI_DETECTION_SYSTEM_PROMPT

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("/", response_model=AnalyzeResponse)
async def analyze_submission(
    context_id: str = Form(...),
    file: UploadFile = File(...),
):
    """Upload a student submission to analyze for AI-generated content."""
    try:
        context = load_context(context_id)
        submission_text, file_type = await extract_text(file)

        user_message = (
            f"ASSIGNMENT SPECIFICATION:\n{context['spec_text']}\n\n"
            f"STUDENT SUBMISSION ({file_type}):\n{submission_text}"
        )

        result = await call_llm_json(AI_DETECTION_SYSTEM_PROMPT, user_message)

        return AnalyzeResponse(
            context_id=context_id,
            extracted_text=submission_text,
            ai_probability=result.get("ai_probability", -1),
            ai_signals_found=result.get("ai_signals_found", []),
            human_signals_found=result.get("human_signals_found", []),
            ai_assessment=result.get("assessment", result.get("_raw", "")),
            file_type=file_type,
        )
    except Exception as e:
        tb = traceback.format_exc()
        print(f"ANALYZE ERROR:\n{tb}")
        return JSONResponse(status_code=500, content={"detail": str(e), "traceback": tb})

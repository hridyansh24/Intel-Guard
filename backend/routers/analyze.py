import traceback
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from backend.services.extractor import extract_text, extract_text_multi
from backend.services.context_store import load_context
from backend.services.llm import call_llm_json
from backend.services.result_cache import get_cached_result, save_result
from backend.schemas import AnalyzeResponse
from backend.prompts import AI_DETECTION_SYSTEM_PROMPT

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("/", response_model=AnalyzeResponse)
async def analyze_submission(
    context_id: str = Form(...),
    files: list[UploadFile] = File(..., description="Upload 1-10 submission files"),
):
    """Upload student submission files to analyze for AI-generated content. Accepts up to 10 files."""
    try:
        if len(files) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 files allowed.")
        context = load_context(context_id)
        if len(files) == 1:
            submission_text, file_type = await extract_text(files[0])
        else:
            submission_text, file_type = await extract_text_multi(files)

        cached = get_cached_result(context_id, submission_text, "analyze")
        if cached is not None:
            result = cached
        else:
            user_message = (
                f"ASSIGNMENT SPECIFICATION:\n{context['spec_text']}\n\n"
                f"STUDENT SUBMISSION ({file_type}):\n{submission_text}"
            )
            result = await call_llm_json(AI_DETECTION_SYSTEM_PROMPT, user_message)
            save_result(context_id, submission_text, "analyze", result)

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

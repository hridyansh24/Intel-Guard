import traceback
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.services.extractor import extract_text, extract_text_multi
from backend.services.context_store import load_context
from backend.services.llm import call_llm_json
from backend.services.result_cache import get_cached_result, save_result
from backend.services.style_store import get_profile
from backend.schemas import AnalyzeResponse
from backend.prompts import AI_DETECTION_SYSTEM_PROMPT

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("/", response_model=AnalyzeResponse)
async def analyze_submission(
    context_id: str = Form(...),
    files: list[UploadFile] = File(..., description="Upload 1-10 submission files"),
    student_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        if len(files) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 files allowed.")
        context = await load_context(db, context_id)
        if len(files) == 1:
            submission_text, file_type = await extract_text(files[0], db)
        else:
            submission_text, file_type = await extract_text_multi(files, db)

        # Fetch student style summary if available
        style_summary = ""
        if student_id:
            profile = await get_profile(db, student_id)
            if profile:
                style_summary = profile.get("style_summary", "")

        cached = await get_cached_result(db, context_id, submission_text, "analyze")
        if cached is not None:
            result = cached
        else:
            user_message = (
                f"ASSIGNMENT SPECIFICATION:\n{context['spec_text']}\n\n"
                f"STUDENT SUBMISSION ({file_type}):\n{submission_text}"
            )
            if style_summary:
                user_message += f"\n\nSTUDENT WRITING STYLE PROFILE:\n{style_summary}"
            result = await call_llm_json(AI_DETECTION_SYSTEM_PROMPT, user_message)
            await save_result(db, context_id, submission_text, "analyze", result)

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

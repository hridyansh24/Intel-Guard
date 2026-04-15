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
from backend.prompts import AI_DETECTION_SYSTEM_PROMPT, AI_DETECTION_CODE_PROMPT


def _map_code_result(raw: dict) -> dict:
    """Map forensic code-authorship output → legacy analyze schema."""
    if "ai_probability" in raw:
        return raw
    label = (raw.get("label") or "").lower()
    conf = float(raw.get("confidence") or 0.0)
    if "ai" in label and "human" not in label:
        prob = conf
    elif "human" in label:
        prob = 1.0 - conf
    elif "hybrid" in label:
        prob = 0.5 + 0.2 * conf
    else:
        prob = 0.5
    signals = raw.get("signals") or []
    ai_signals, human_signals = [], []
    ai_weight_count = 0
    for s in signals:
        if not isinstance(s, dict):
            continue
        weight = (s.get("weight") or "").lower()
        line = f"[{s.get('weight','?')}] {s.get('name','')}: {s.get('evidence','')}"
        if "ai" in label or "hybrid" in label:
            ai_signals.append(line)
            if weight in ("medium", "high"):
                ai_weight_count += 1
        else:
            human_signals.append(line)
    # Escalate: 3+ medium/high AI signals → force 0.9+ regardless of label/confidence
    if ai_weight_count >= 3:
        prob = max(prob, 0.90 + min(0.09, 0.02 * (ai_weight_count - 3)))
    return {
        "ai_probability": prob,
        "ai_signals_found": ai_signals,
        "human_signals_found": human_signals,
        "assessment": f"[{raw.get('label','?')} @ conf={conf:.2f}] {raw.get('rationale','')}",
    }

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
            is_code = "code" in file_type and "text" not in file_type and "pdf" not in file_type
            prompt = AI_DETECTION_CODE_PROMPT if is_code else AI_DETECTION_SYSTEM_PROMPT
            result = await call_llm_json(prompt, user_message)
            if is_code:
                result = _map_code_result(result)
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

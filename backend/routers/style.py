from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.services.extractor import extract_text, extract_text_multi
from backend.services.context_store import load_context
from backend.services.llm import call_llm_json
from backend.services.style_analyzer import analyze_style, get_scalar_metrics, get_vector_metrics
from backend.services.style_store import (
    get_profile, list_profiles, update_profile, compute_deviation, compute_confidence_score,
    MIN_WORD_COUNT,
)
from backend.prompts import STYLE_FINGERPRINT_PROSE_PROMPT, STYLE_FINGERPRINT_CODE_PROMPT
from backend.schemas import StyleUpdateResponse, StyleProfileResponse, StyleCompareResponse

router = APIRouter(prefix="/style", tags=["style"])


async def _run_qualitative_analysis(spec: str, text: str, content_type: str) -> dict | None:
    if len(text.split()) < MIN_WORD_COUNT:
        return None
    prompt = STYLE_FINGERPRINT_CODE_PROMPT if content_type == "code" else STYLE_FINGERPRINT_PROSE_PROMPT
    user_msg = f"ASSIGNMENT SPECIFICATION:\n{spec}\n\nSTUDENT SUBMISSION:\n{text}"
    result = await call_llm_json(prompt, user_msg, use_mini=True)
    if "_parse_failed" in result:
        return None
    return result


@router.post("/update", response_model=StyleUpdateResponse)
async def update_student_style(
    student_id: str = Form(...),
    context_id: str = Form(...),
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed.")

    context = await load_context(db, context_id)
    if len(files) == 1:
        text, file_type = await extract_text(files[0], db)
    else:
        text, file_type = await extract_text_multi(files, db)

    if len(text.split()) < MIN_WORD_COUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Submission too short ({len(text.split())} words). Need at least {MIN_WORD_COUNT}.",
        )

    style_data = analyze_style(text, file_type)
    scalars = get_scalar_metrics(style_data)
    vectors = get_vector_metrics(style_data)
    qualitative = await _run_qualitative_analysis(context["spec_text"], text, style_data["content_type"])

    profile = await update_profile(
        db, student_id=student_id, scalar_metrics=scalars, vector_metrics=vectors,
        qualitative=qualitative, context_id=context_id, content_type=style_data["content_type"],
    )

    return StyleUpdateResponse(
        student_id=student_id,
        submission_count=profile["submission_count"],
        content_type=style_data["content_type"],
        message=f"Profile updated. {profile['submission_count']} submission(s) analyzed.",
    )


@router.get("/profiles")
async def get_all_profiles(db: AsyncSession = Depends(get_db)):
    return await list_profiles(db)


@router.get("/{student_id}", response_model=StyleProfileResponse)
async def get_student_profile(student_id: str, db: AsyncSession = Depends(get_db)):
    profile = await get_profile(db, student_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"No profile found for student: {student_id}")
    return StyleProfileResponse(**profile)


@router.post("/compare", response_model=StyleCompareResponse)
async def compare_submission(
    student_id: str = Form(...),
    context_id: str = Form(...),
    files: list[UploadFile] = File(...),
    ai_probability: float = Form(None),
    db: AsyncSession = Depends(get_db),
):
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed.")

    profile = await get_profile(db, student_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"No profile found for student: {student_id}")

    context = await load_context(db, context_id)
    if len(files) == 1:
        text, file_type = await extract_text(files[0], db)
    else:
        text, file_type = await extract_text_multi(files, db)

    if len(text.split()) < MIN_WORD_COUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Submission too short ({len(text.split())} words). Need at least {MIN_WORD_COUNT}.",
        )

    style_data = analyze_style(text, file_type)
    scalars = get_scalar_metrics(style_data)
    vectors = get_vector_metrics(style_data)
    qualitative = await _run_qualitative_analysis(context["spec_text"], text, style_data["content_type"])

    deviation = compute_deviation(profile, scalars, vectors, qualitative)

    confidence = None
    if ai_probability is not None:
        confidence = compute_confidence_score(ai_probability=ai_probability, style_deviation=deviation["style_deviation_score"])

    return StyleCompareResponse(
        student_id=student_id,
        style_deviation_score=deviation["style_deviation_score"],
        quantitative_deviation=deviation["quantitative_deviation"],
        qualitative_deviation=deviation["qualitative_deviation"],
        top_deviations=deviation["top_deviations"],
        sufficient_history=deviation["sufficient_history"],
        submission_count=deviation["submission_count"],
        confidence_score=confidence,
        message=deviation.get("message"),
    )

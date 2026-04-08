"""
Per-student writing style profile storage (PostgreSQL).

Uses Welford's online algorithm for incremental mean/variance updates.
Profile data stored as JSONB columns.
"""

import math
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import StyleProfile


# ── Welford's online algorithm ──

def _welford_update(existing: dict, new_value: float) -> dict:
    n = existing.get("n", 0) + 1
    old_mean = existing.get("mean", 0.0)
    delta = new_value - old_mean
    new_mean = old_mean + delta / n
    delta2 = new_value - new_mean
    new_m2 = existing.get("m2", 0.0) + delta * delta2
    return {
        "mean": round(new_mean, 6),
        "m2": round(new_m2, 6),
        "n": n,
        "variance": round(new_m2 / n, 6) if n > 1 else 0.0,
    }


def _welford_update_vector(existing: dict, new_vector: list[float]) -> dict:
    n = existing.get("n", 0) + 1
    old_mean = existing.get("mean", [0.0] * len(new_vector))
    old_m2 = existing.get("m2", [0.0] * len(new_vector))

    size = max(len(new_vector), len(old_mean))
    old_mean = old_mean + [0.0] * (size - len(old_mean))
    old_m2 = old_m2 + [0.0] * (size - len(old_m2))
    new_vector = new_vector + [0.0] * (size - len(new_vector))

    new_mean, new_m2, variance = [], [], []
    for i in range(size):
        delta = new_vector[i] - old_mean[i]
        nm = old_mean[i] + delta / n
        delta2 = new_vector[i] - nm
        m2 = old_m2[i] + delta * delta2
        new_mean.append(round(nm, 6))
        new_m2.append(round(m2, 6))
        variance.append(round(m2 / n, 6) if n > 1 else 0.0)

    return {"mean": new_mean, "m2": new_m2, "n": n, "variance": variance}


# ── Profile CRUD ──

async def get_profile(db: AsyncSession, student_id: str) -> dict | None:
    result = await db.get(StyleProfile, student_id)
    if not result:
        return None
    return _serialize(result)


async def list_profiles(db: AsyncSession) -> list[dict]:
    from sqlalchemy import select
    result = await db.execute(select(StyleProfile))
    return [
        {
            "student_id": p.student_id,
            "submission_count": p.submission_count,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
        for p in result.scalars()
    ]


async def update_profile(
    db: AsyncSession,
    student_id: str,
    scalar_metrics: dict[str, float],
    vector_metrics: dict[str, list[float]],
    qualitative: dict | None = None,
    context_id: str = "",
    content_type: str = "prose",
) -> dict:
    profile = await db.get(StyleProfile, student_id)
    now = datetime.now(timezone.utc)

    if not profile:
        profile = StyleProfile(
            student_id=student_id,
            submission_count=0,
            created_at=now,
            updated_at=now,
            quantitative_scalars={},
            quantitative_vectors={},
            qualitative={},
            submission_history=[],
        )
        db.add(profile)

    scalars = dict(profile.quantitative_scalars or {})
    vectors = dict(profile.quantitative_vectors or {})
    qual = dict(profile.qualitative or {})
    history = list(profile.submission_history or [])

    # Update scalar metrics with Welford's
    for metric_name, value in scalar_metrics.items():
        scalars[metric_name] = _welford_update(scalars.get(metric_name, {}), value)

    # Update vector metrics with Welford's
    for metric_name, vector in vector_metrics.items():
        vectors[metric_name] = _welford_update_vector(vectors.get(metric_name, {}), vector)

    # Update qualitative
    if qualitative:
        if not qual:
            qual = {"dimensions": {}, "characteristic_phrases": [], "overall_impressions": []}
        dims = qual.get("dimensions", {})
        for dim_name in ["formality", "confidence", "complexity", "conciseness",
                         "voice", "argument_style", "explanation_pattern", "transition_style"]:
            dim_data = qualitative.get(dim_name, {})
            if isinstance(dim_data, dict) and "score" in dim_data:
                if dim_name not in dims:
                    dims[dim_name] = {"scores": [], "notes": []}
                dims[dim_name]["scores"].append(dim_data["score"])
                dims[dim_name]["scores"] = dims[dim_name]["scores"][-10:]
                if "note" in dim_data:
                    dims[dim_name]["notes"].append(dim_data["note"])
                    dims[dim_name]["notes"] = dims[dim_name]["notes"][-10:]
                scores = dims[dim_name]["scores"]
                dims[dim_name]["mean"] = round(sum(scores) / len(scores), 2)
        qual["dimensions"] = dims

        if "top_5_phrases" in qualitative:
            phrases = qual.get("characteristic_phrases", [])
            phrases.append(qualitative["top_5_phrases"])
            qual["characteristic_phrases"] = phrases[-10:]
        if "overall_impression" in qualitative:
            impressions = qual.get("overall_impressions", [])
            impressions.append(qualitative["overall_impression"])
            qual["overall_impressions"] = impressions[-10:]

    # Submission history
    history.append({
        "context_id": context_id,
        "content_type": content_type,
        "submitted_at": now.isoformat(),
        "scalar_snapshot": scalar_metrics,
    })
    history = history[-10:]

    profile.quantitative_scalars = scalars
    profile.quantitative_vectors = vectors
    profile.qualitative = qual
    profile.submission_history = history
    profile.submission_count += 1
    profile.updated_at = now
    profile.style_summary = _build_style_summary(qual, profile.submission_count)

    await db.commit()
    return _serialize(profile)


def _serialize(p: StyleProfile) -> dict:
    return {
        "student_id": p.student_id,
        "submission_count": p.submission_count,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        "quantitative_scalars": p.quantitative_scalars or {},
        "quantitative_vectors": p.quantitative_vectors or {},
        "qualitative": p.qualitative or {},
        "style_summary": p.style_summary or "",
        "submission_history": p.submission_history or [],
    }


# ── Style summary generation ──

SCORE_LABELS = {1: "very low", 2: "low", 3: "moderate", 4: "high", 5: "very high"}

def _build_style_summary(qual: dict, submission_count: int) -> str:
    """Build a human-readable writing style summary from accumulated qualitative data."""
    if not qual or not qual.get("dimensions"):
        return ""

    dims = qual["dimensions"]
    parts = []

    dim_descriptions = {
        "formality": ("formality", "casual/slang", "academic/formal"),
        "confidence": ("confidence", "hedging/uncertain", "assertive/declarative"),
        "complexity": ("complexity", "simple sentences", "complex clauses and advanced vocabulary"),
        "conciseness": ("conciseness", "verbose/wordy", "terse/minimal"),
        "voice": ("voice", "passive", "active"),
    }

    for dim_name, (label, low_desc, high_desc) in dim_descriptions.items():
        dim = dims.get(dim_name, {})
        mean = dim.get("mean")
        if mean is not None:
            level = SCORE_LABELS.get(round(mean), "moderate")
            parts.append(f"{level} {label}")

    summary = f"Based on {submission_count} submission(s), this student's writing style is: {', '.join(parts)}."

    # Add characteristic phrases
    phrases = qual.get("characteristic_phrases", [])
    if phrases:
        # Flatten — each entry is a list of 5 phrases from one submission
        flat = []
        for p in phrases:
            if isinstance(p, list):
                flat.extend(p)
            else:
                flat.append(p)
        if flat:
            summary += f" Characteristic phrases: {', '.join(repr(p) for p in flat[-8:])}."

    # Add overall impressions
    impressions = qual.get("overall_impressions", [])
    if impressions:
        summary += f" Overall: {impressions[-1]}"

    # Add notes from dimensions
    notes = []
    for dim_name in ["formality", "confidence", "complexity", "voice"]:
        dim = dims.get(dim_name, {})
        dim_notes = dim.get("notes", [])
        if dim_notes:
            notes.append(dim_notes[-1])
    if notes:
        summary += f" Style notes: {'; '.join(notes)}."

    return summary


# ── Deviation scoring ──

SCALAR_WEIGHTS = {
    "sentence.sentence_length_std": 2.5,
    "punctuation.semicolon_per_1000": 2.0,
    "punctuation.em_dash_per_1000": 2.0,
    "punctuation.comma_per_1000": 1.5,
    "lexical.hapax_ratio": 2.0,
    "lexical.type_token_ratio": 1.5,
    "lexical.yules_k": 1.5,
    "sentence.mean_sentence_length": 1.5,
    "readability.flesch_kincaid": 1.5,
    "readability.ari": 1.0,
    "lexical.avg_word_length": 1.0,
    "lexical.advanced_vocab_ratio": 1.0,
    "sentence.question_ratio": 1.0,
    "punctuation.colon_per_1000": 1.0,
    "punctuation.parentheses_per_1000": 1.0,
    "sentence.exclamation_ratio": 0.5,
    "punctuation.quote_per_1000": 0.5,
    "punctuation.ellipsis_per_1000": 0.5,
    "code.comment_density": 2.0,
    "code.avg_line_length": 1.5,
    "code.line_length_std": 1.5,
    "code.avg_identifier_length": 2.0,
    "code.snake_case_ratio": 2.0,
    "code.camel_case_ratio": 2.0,
    "code.avg_function_length": 1.5,
    "code.blank_line_ratio": 1.0,
}

VECTOR_WEIGHTS = {
    "function_words": 3.0,
    "word_length_dist": 1.5,
    "sentence_length_dist": 1.5,
}

MIN_SUBMISSIONS_FOR_COMPARISON = 3
MIN_WORD_COUNT = 300


def _cosine_distance(a: list[float], b: list[float]) -> float:
    size = min(len(a), len(b))
    if size == 0:
        return 0.0
    dot = sum(a[i] * b[i] for i in range(size))
    mag_a = math.sqrt(sum(x * x for x in a[:size]))
    mag_b = math.sqrt(sum(x * x for x in b[:size]))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return round(1 - dot / (mag_a * mag_b), 6)


def compute_deviation(
    profile: dict,
    new_scalars: dict[str, float],
    new_vectors: dict[str, list[float]],
    new_qualitative: dict | None = None,
) -> dict:
    n = profile["submission_count"]
    sufficient = n >= MIN_SUBMISSIONS_FOR_COMPARISON

    if not sufficient:
        return {
            "style_deviation_score": 0.0,
            "quantitative_deviation": 0.0,
            "qualitative_deviation": 0.0,
            "top_deviations": [],
            "sufficient_history": False,
            "submission_count": n,
            "message": f"Need {MIN_SUBMISSIONS_FOR_COMPARISON - n} more submission(s) to compare style.",
        }

    all_deviations = []

    for metric, weight in SCALAR_WEIGHTS.items():
        stored = profile["quantitative_scalars"].get(metric)
        new_val = new_scalars.get(metric)
        if stored is None or new_val is None or stored.get("n", 0) < MIN_SUBMISSIONS_FOR_COMPARISON:
            continue
        variance = stored["variance"]
        if variance < 1e-10:
            continue
        z = abs(new_val - stored["mean"]) / math.sqrt(variance)
        z_capped = min(z, 4.0)
        all_deviations.append({
            "metric": metric, "z_score": round(z, 2), "weight": weight,
            "weighted_z": round(z_capped * weight, 2),
            "direction": "higher" if new_val > stored["mean"] else "lower",
            "profile_mean": stored["mean"], "new_value": round(new_val, 4),
        })

    for metric, weight in VECTOR_WEIGHTS.items():
        stored = profile["quantitative_vectors"].get(metric)
        new_vec = new_vectors.get(metric)
        if stored is None or new_vec is None or stored.get("n", 0) < MIN_SUBMISSIONS_FOR_COMPARISON:
            continue
        dist = _cosine_distance(stored["mean"], new_vec)
        z_equiv = dist * 20
        z_capped = min(z_equiv, 4.0)
        all_deviations.append({
            "metric": metric, "z_score": round(z_equiv, 2), "weight": weight,
            "weighted_z": round(z_capped * weight, 2), "direction": "diverged",
        })

    total_weight = sum(d["weight"] for d in all_deviations) or 1.0
    total_weighted_z = sum(d["weighted_z"] for d in all_deviations)
    quant_dev = min((total_weighted_z / total_weight) / 4.0, 1.0)

    qual_dev = 0.0
    if new_qualitative and profile.get("qualitative", {}).get("dimensions"):
        deviations = []
        dims = profile["qualitative"]["dimensions"]
        for dim_name in ["formality", "confidence", "complexity", "conciseness", "voice"]:
            hist = dims.get(dim_name, {})
            new_dim = new_qualitative.get(dim_name, {})
            if isinstance(new_dim, dict) and "score" in new_dim and "mean" in hist:
                deviations.append(abs(new_dim["score"] - hist["mean"]) / 4.0)
        qual_dev = sum(deviations) / len(deviations) if deviations else 0.0

    if n < 5:
        combined = 0.5 * quant_dev + 0.5 * qual_dev
    elif n < 8:
        combined = 0.6 * quant_dev + 0.4 * qual_dev
    else:
        combined = 0.7 * quant_dev + 0.3 * qual_dev

    top_devs = sorted(all_deviations, key=lambda d: d["weighted_z"], reverse=True)[:5]

    return {
        "style_deviation_score": round(combined, 4),
        "quantitative_deviation": round(quant_dev, 4),
        "qualitative_deviation": round(qual_dev, 4),
        "top_deviations": top_devs,
        "sufficient_history": True,
        "submission_count": n,
    }


def compute_confidence_score(
    ai_probability: float | None,
    style_deviation: float,
    time_anomaly: float = 0.0,
    quiz_score: float | None = None,
) -> dict:
    W_AI, W_STYLE, W_TIME = 0.50, 0.35, 0.15
    QUIZ_REDUCTION_MAX = 0.65

    components = {}
    weighted_sum = 0.0
    total_weight = 0.0

    if ai_probability is not None:
        components["ai_detection"] = {
            "value": round(ai_probability, 4), "weight": W_AI,
            "contribution": round(ai_probability * W_AI, 4),
        }
        weighted_sum += ai_probability * W_AI
        total_weight += W_AI

    if style_deviation > 0:
        components["style_deviation"] = {
            "value": round(style_deviation, 4), "weight": W_STYLE,
            "contribution": round(style_deviation * W_STYLE, 4),
        }
        weighted_sum += style_deviation * W_STYLE
        total_weight += W_STYLE

    if time_anomaly > 0:
        components["time_anomaly"] = {
            "value": round(time_anomaly, 4), "weight": W_TIME,
            "contribution": round(time_anomaly * W_TIME, 4),
        }
        weighted_sum += time_anomaly * W_TIME
        total_weight += W_TIME

    raw_score = weighted_sum / total_weight if total_weight > 0 else 0.0

    quiz_reduction = 0.0
    if quiz_score is not None:
        quiz_reduction = quiz_score * QUIZ_REDUCTION_MAX
        components["quiz_adjustment"] = {
            "quiz_score": round(quiz_score, 4),
            "reduction": round(quiz_reduction, 4),
        }

    confidence = round(max(0.0, min(1.0, raw_score * (1 - quiz_reduction))), 4)

    if confidence < 0.25:
        level = "low"
    elif confidence < 0.45:
        level = "moderate"
    elif confidence < 0.65:
        level = "elevated"
    else:
        level = "high"

    return {
        "confidence": confidence,
        "raw_score": round(raw_score, 4),
        "level": level,
        "components": components,
        "should_quiz": confidence >= 0.45,
    }

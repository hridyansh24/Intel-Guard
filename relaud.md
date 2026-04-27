# Next step — #1: LLM Council for borderline cases

Inspired by Ipeirotis/Rizakos (arXiv:2603.18221) + Karpathy's `llm-council`. Goal: when AI-detection confidence lands in the ambiguous band, don't force a single-model verdict — run a 3-stage council (independent → anonymized peer review → chairman synthesis) and surface the result.

## When it fires
Only when raw confidence is in the **0.45–0.65 elevated band**. Below 0.45 (clearly human) and above 0.65 (clearly AI) skip the council — saves cost on the easy cases.

## Architecture (3 stages, Karpathy pattern)

1. **Independent first opinions** — each council member sees spec + submission + optional style profile. Produces its own `{ai_probability, evidence, verdict}` with no knowledge of the others.
2. **Anonymized peer review** — each member sees the others' verdicts with **model identity stripped** (labeled Model A / B / C). Prevents deference bias (the "Claude said X so I'll agree" failure mode). Each member revises or holds.
3. **Chairman synthesis** — Sonnet 4.5 reads all three final opinions + their evidence, produces the final verdict with a "models agreed/disagreed" flag.

## Roles
- **Chairman:** `claude-sonnet-4-5` (final synthesis only — one call per council run).
- **Members (3):** `claude-haiku-4-5`, `claude-sonnet-4-5` (different system prompt, plays skeptic), and one non-Anthropic model. Two options for the third slot:
  - **Option A — OpenRouter:** one key, one bill, access to Gemini/GPT. Loses Anthropic-native prompt caching on Anthropic calls routed through it.
  - **Option B — direct SDK per provider:** keeps Anthropic caching, adds Gemini SDK + key. More integration work, cheaper over time.
  - **Decision:** defer until implementation. Start with 3 Anthropic calls (Haiku + two Sonnets with different prompts) to prove the pattern, add cross-provider after.

## Cost envelope
- Clean + clearly-AI submissions (>80% of flow): **no council cost.**
- Ambiguous submissions (~20%): +3 member calls + 1 chairman call = ~4× detection cost on that submission only.
- Prompt caching still applies to the spec portion of each call (same context_id → cache hit on spec).

## Implementation plan

### 1. `backend/services/llm.py`
Add `call_llm_council()`:
```python
async def call_llm_council(
    spec: str,
    submission: str,
    style_summary: str | None,
    initial_detection: dict,
) -> dict:
    # Stage 1: fire 3 members in parallel (asyncio.gather)
    # Stage 2: fire 3 members in parallel, each seeing anonymized peer verdicts
    # Stage 3: single chairman call synthesizing final verdict
    # Returns: {final_probability, agreement: "unanimous"|"split", members: [...], chairman_reasoning}
```
- Use `asyncio.gather` for stages 1 and 2 to parallelize member calls.
- Reuse existing `call_llm_json` — add a `model_override` kwarg so each member can be pinned.

### 2. `backend/prompts.py`
Three new prompts:
- `COUNCIL_MEMBER_PROMPT_STAGE1` — same signals as `AI_DETECTION_SYSTEM_PROMPT` but outputs a **single-member verdict** schema (includes `confidence_in_own_verdict`).
- `COUNCIL_MEMBER_PROMPT_STAGE2` — takes stage-1 verdict + anonymized peers, asks member to revise or hold with reasoning.
- `COUNCIL_CHAIRMAN_PROMPT` — takes all 3 final opinions + evidence, outputs final `{ai_probability, agreement, reasoning, dissenting_views}`.

### 3. `backend/routers/submit.py`
After confidence is computed, before saving:
```python
if result["confidence_score"] and 0.45 <= raw <= 0.65:
    council = await call_llm_council(spec, submission_text, style_summary, detection)
    result["council"] = council
    # Re-derive ai_probability from council, recompute confidence_score
```
Gate behind a `use_council: bool = Form(True)` flag so it can be disabled for testing.

### 4. `backend/schemas.py`
Add to `SubmitResponse`:
```python
council: Optional[dict] = None  # {final_probability, agreement, members, chairman_reasoning}
```

### 5. Caching
Cache council results in `result_cache.py` under a new operation key `"council"`. Same `(context_id, submission_text)` → skip re-running the council on retries.

### 6. Frontend surface (minimal, for now)
- **Professor app** (`ClassDashboard.jsx` submissions tab): if `council` present, show a "Council: agreed/split" badge + expandable panel with each member's final verdict. This is the differentiator — professors trust a panel of models over a single number.
- **Student app:** no change. Students don't see the council.

## What this unlocks
- Enables roadmap #3 (open-response tier) — the council pattern is reused for grading open answers.
- Defensible flags: a "Council: 3/3 agreed, probability 0.78" verdict survives a student challenge in a way "Claude said 0.78" does not.

## Open questions to resolve during implementation
- **Member diversity:** is two-Sonnets-with-different-prompts enough for Stage 1, or do we need genuine cross-provider diversity to avoid shared failure modes? Lean toward cross-provider for the final version, single-provider for the MVP.
- **Split verdict UX:** if stage 2 doesn't converge (e.g., 2-1 split), do we force the chairman to pick, or surface "models disagreed — professor review" as a first-class state? Preference: surface the disagreement.
- **Latency:** 3 parallel calls + 3 parallel calls + 1 call = ~3× the wall-clock of a single detection. `/submit/` is already slow — acceptable, but consider background-job pattern if users complain.

## Estimated scope
~1 day of focused work. Uses existing infra (`call_llm_json`, result cache, confidence formula). No schema migrations needed — `council` is a new JSONB field in the existing `submissions.result` blob.

# AI Guard

## What this project is
Academic integrity platform — detects AI-generated submissions and verifies student comprehension through quizzes and summaries. Local Python backend + React frontend now, browser extension later.

## Tech stack
- **Backend:** Python, FastAPI, uvicorn
- **Frontend:** React (Vite), React Router — dark theme with blue accent
- **LLM:** Provider-agnostic (OpenAI/Anthropic/Gemini) — configured via `.env`. Currently using Anthropic Claude API (Sonnet 4.5 primary, Haiku 4.5 mini) with prompt caching.
- **PDF parsing:** pdfplumber
- **Config:** pydantic-settings, python-dotenv
- **Database:** PostgreSQL (async via SQLAlchemy + asyncpg) — Supabase or Neon for deployment

## How to run
```bash
# Quick setup (new machine)
./setup.sh

# Or manually:
cp .env.example .env  # fill in API key
pip install -r requirements.txt
cd frontend-professor && npm install && cd ..
cd frontend-student && npm install && cd ..

# Run (three terminals)
uvicorn backend.main:app --reload              # Backend → http://localhost:8000/docs
cd frontend-professor && npm run dev           # Professor → http://localhost:5174
cd frontend-student && npm run dev             # Student → http://localhost:5175
```

## Project structure
```
frontend-professor/              # Professor React SPA (Vite, port 5174)
├── src/
│   ├── main.jsx                 # Entry point
│   ├── App.jsx                  # Class list → class dashboard
│   ├── api.js                   # All API calls (proxied to localhost:8000)
│   ├── index.css                # Global styles, dark theme
│   └── pages/
│       └── ClassDashboard.jsx   # Tabs: assignments, students, submissions, analyze, style profiles
frontend-student/                # Student React SPA (Vite, port 5175)
├── src/
│   ├── main.jsx                 # Entry point
│   ├── App.jsx                  # Signup → dashboard (persisted in localStorage)
│   ├── api.js                   # All API calls (proxied to localhost:8000)
│   ├── index.css                # Global styles, dark theme
│   └── pages/
│       └── Dashboard.jsx        # Join class, submit work, quiz/summary, history
frontend/                        # (Legacy) Original combined SPA — kept for reference
backend/
├── main.py              # FastAPI app entrypoint (lifespan handler creates tables on startup)
├── config.py            # Settings from .env (DATABASE_URL for PostgreSQL)
├── database.py          # Async SQLAlchemy engine, session factory, Base, get_db dependency
├── models.py            # All SQLAlchemy ORM models (Student, Class, Context, Submission, StyleProfile, caches)
├── schemas.py           # All Pydantic request/response models
├── prompts.py           # All LLM system prompts (shared across routers)
├── routers/
│   ├── context.py       # Upload assignment specs (the "context")
│   ├── analyze.py       # AI detection with 7-layer heuristic prompt
│   ├── quiz.py          # Generate + evaluate comprehension questions (evaluate uses mini model)
│   ├── summary.py       # Comprehension-focused submission walkthrough
│   ├── submit.py        # Combined endpoint — orchestrates detect → style → quiz/summary + saves submission record
│   ├── style.py         # Writing style fingerprinting — update profiles, compare, get profiles
│   ├── students.py      # Student registration (name → unique ID)
│   ├── classes.py       # Class CRUD, join, link assignments, view roster/submissions
│   └── submissions.py   # Submission history — list, get, update quiz results
└── services/
    ├── llm.py           # LLM abstraction — async, dual models, JSON retry, client caching
    ├── extractor.py     # PDF, code, and text file extraction (with DB-backed caching)
    ├── context_store.py # Context CRUD via PostgreSQL
    ├── student_store.py   # Student registration via PostgreSQL
    ├── class_store.py     # Class management via PostgreSQL (with selectinload for relationships)
    ├── submission_store.py # Submission records via PostgreSQL (JSONB for results)
    ├── submission_cache.py # Caches extracted text by content hash (PostgreSQL)
    ├── result_cache.py    # Caches LLM responses + quiz pools (PostgreSQL, JSONB)
    ├── style_analyzer.py  # Quantitative style metrics (~80 features) for prose + code
    └── style_store.py     # Per-student profile storage, Welford's algorithm, deviation scoring (PostgreSQL, JSONB)
```

## Key concepts
- **Context** = assignment specification. Uploaded first, referenced by `context_id` in all subsequent calls. Every LLM call gets the assignment spec injected into the system prompt so questions/analysis are grounded in what was actually assigned.
- **Analyze** = AI detection. Uses an 8-layer prompt: content-level, word-level, grammar, formatting, communication artifacts, "soulless but clean" test, code-specific signals, and **Layer 8: writing style comparison** (when student profile is available, the LLM compares submission against the student's known writing patterns).
- **Quiz** = comprehension verification via MCQ. Questions are 4-option multiple-choice with pre-generated explanations per option. Grading is deterministic (no LLM call) — backend matches chosen_index against stored correct_index. Anti-hallucination rules enforce that all options are grounded in literal submission/spec text.
- **Summary** = comprehension walkthrough. Student-friendly, structured so they can't just scroll past.
- **Style** = writing style fingerprinting. Hybrid quantitative (~80 metrics) + qualitative (LLM-rated) analysis. Per-student profiles updated incrementally via Welford's online algorithm. Computes deviation score on new submissions. Generates a `style_summary` (natural language description) stored in DB and injected into AI detection prompts for personalized analysis.
- **Confidence Score** = combined heuristic score. Formula: `raw = W_AI(0.50) × ai_prob + W_STYLE(0.35) × style_dev + W_TIME(0.15) × time_anomaly`, then `confidence = raw × (1 - quiz_score × 0.65)`. Thresholds: <0.25 low, 0.25-0.45 moderate, 0.45-0.65 elevated (quiz), 0.65+ high (quiz + flag).
- **Student** = registered user with a unique ID (UUID-8). Signs up with just a name (testing mode). Stored in `students` table.
- **Class** = a group of students linked to assignments. Professor creates classes, students join. Stored in `classes` table with `class_students` association table and `class_contexts` table (includes per-assignment `skip_detection` flag).
- **Submission Record** = persisted record of a student's submission with AI detection, style analysis, confidence score, and quiz results. Stored in `submissions` table (JSONB columns for complex results). Created automatically when student submits via `/submit/` with both `student_id` and `class_id`.

## Cost optimizations
- **Dual-model routing:** Primary model (Sonnet 4.5) for detection, quiz generation, summary. Mini model (Haiku 4.5) for style fingerprinting qualitative analysis. Quiz evaluation is now deterministic (MCQ) — no LLM call needed.
- **Submission caching:** Extracted text is cached by SHA-256 hash. Re-uploading the same file (retries) skips extraction entirely.
- **Optional AI detection:** `POST /submit/` accepts `skip_detection=True` for quiz-everyone mode. Saves one full primary-model call per submission (~20% cost reduction).
- **LLM result caching (`result_cache.py`):** Caches LLM responses in PostgreSQL keyed by `hash(context_id + submission_text + operation)`. Analyze, quiz, and summary results are all cached — same submission against the same assignment never triggers a repeat LLM call. Cache is shared across endpoints (e.g., `/analyze/` and `/submit/` hit the same cache key for detection).
- **MCQ quiz with deterministic grading:** Quiz evaluation no longer calls the LLM. Questions are pre-generated as 4-option MCQs with `correct_index` and per-option `explanations` stored server-side. Client receives only `{question, options, question_number}` (answers stripped). On evaluate, backend matches `chosen_index` against stored answer — zero cost per quiz attempt.
- **Quiz question pool with exhaustion refresh:** First call generates `num_questions * 4` (e.g., 12 for a 3-question quiz) MCQs and caches the pool. Each retry serves unseen questions only — tracked via `served_indices`. When all exhausted, pool is deleted and regenerated. If pool has fewer than requested questions, serves what's available instead of failing.

### Cost metrics summary
| Optimization | What it saves | When it kicks in |
|---|---|---|
| Dual-model routing | ~60-80% per evaluation call (mini vs primary) | Every quiz answer evaluation |
| `skip_detection=True` | 1 full primary-model call (~20% of a `/submit/` flow) | When instructor opts out of AI detection |
| Submission text caching | PDF/file parsing time (not LLM cost) | Same file re-uploaded (retries) |
| Result cache — analyze | 1 primary-model call per duplicate analysis | Same file + same assignment re-analyzed |
| Result cache — summary | 1 primary-model call per duplicate summary | Same file + same assignment re-summarized |
| Quiz pool (4x generation) | 1 primary-model call per quiz retry | Student fails quiz and retries (2nd–4th attempt = free, 5th generates fresh pool) |

### Worst-case vs optimized: token cost per submission
Assuming a `/submit/` call with detection + quiz (3 questions) + summary, ~2000 input tokens:

| Scenario | Without caching | With caching |
|---|---|---|
| First submission | 3 primary calls (~6,600 tokens) | 3 primary calls (~7,050 tokens — quiz pool 4x overhead) |
| Same student retries quiz (attempts 2–4) | +2,150 tokens per retry | **0 tokens** (unseen questions from pool) |
| Same student retries quiz (attempt 5+) | +2,150 tokens | ~7,050 tokens (fresh pool generated, then free again for next 3 retries) |
| Same student retries everything | +6,600 tokens | **0 tokens** (all cached — analyze + summary never regenerate) |
| Different student, same file + assignment | +6,600 tokens | **0 tokens** (shared cache) |

## Conventions
- LLM calls always go through `services/llm.py` — never call provider SDKs directly from routers
- `call_llm()` is async — all LLM calls run in a thread pool to avoid blocking the event loop
- Use `call_llm_json()` when you expect structured JSON back — it retries once and strips markdown fences
- Use `use_mini=True` for high-frequency, simpler LLM tasks (style fingerprinting qualitative analysis)
- Anthropic prompt caching enabled — system prompts use `cache_control: {"type": "ephemeral"}` (5-min TTL, 10% cost on cache hits)
- `max_tokens` set to 4096 for Anthropic (needed for MCQ pool generation with 12 questions + explanations)
- All LLM system prompts live in `prompts.py` — routers import from there, never define prompts inline
- File extraction always goes through `services/extractor.py`
- Accepts any file type: PDF, code files (.py, .js, .java, .cpp, etc.), plain text
- All data stored in PostgreSQL — no JSON files on disk (migrated 2026-04-08)
- All service functions are async and accept `db: AsyncSession` as first parameter
- All routers inject `db: AsyncSession = Depends(get_db)` and pass it to service calls
- JSONB columns used for complex nested data (style profiles, cache results, submission details)

## API endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/context/` | Upload 1-10 assignment spec files (PDF/code/text) → returns `context_id` |
| GET | `/context/` | List all stored contexts |
| GET | `/context/{id}` | Get a specific context |
| POST | `/analyze/` | Upload 1-10 submission files + `context_id` → AI detection (7-layer) |
| POST | `/quiz/generate` | Submission text + `context_id` → comprehension questions |
| POST | `/quiz/evaluate` | MCQ answer (chosen_index + question text) → deterministic pass/fail + explanation (no LLM call) |
| POST | `/summary/` | Submission text + `context_id` → comprehension walkthrough |
| POST | `/submit/` | Combined endpoint: 1-10 files, detect → style → quiz/summary. Optional `student_id` + `class_id` for tracking. |
| POST | `/style/update` | Upload submission files + `student_id` + `context_id` → update student's style profile |
| GET | `/style/profiles` | List all student style profiles |
| GET | `/style/{student_id}` | Get a student's full style profile |
| POST | `/style/compare` | Upload files + `student_id` + `context_id` → compare against historical profile, return deviation score |
| POST | `/students/register` | Register student (name + password) → returns `student_id` |
| POST | `/students/login` | Login student (student_id + password) → returns student info |
| GET | `/students/` | List all students |
| GET | `/students/{id}` | Get a student |
| POST | `/classes/` | Create a class (name) → returns `class_id` |
| GET | `/classes/` | List all classes |
| GET | `/classes/{id}` | Get a class (with students[] and contexts[]) |
| POST | `/classes/{id}/join` | Student joins a class |
| POST | `/classes/{id}/context` | Link an assignment to a class |
| GET | `/classes/{id}/students` | Get students in a class |
| GET | `/classes/{id}/submissions` | Get submissions for a class (optional `?context_id=` filter) |
| GET | `/classes/student/{id}` | Get classes a student belongs to |
| GET | `/submissions/` | List submissions (filterable by `class_id`, `student_id`, `context_id`) |
| GET | `/submissions/{id}` | Get a specific submission record |
| PATCH | `/submissions/{id}/quiz` | Update quiz results on a submission |

## Current status
- **Renamed from Intel Guard → AI Guard** (2026-04-05) — placeholder name, final name TBD
- Backend is functional and tested — analyze, submit, quiz generate all confirmed working
- Using Anthropic Claude API: `claude-sonnet-4-5` (primary) and `claude-haiku-4-5` (mini) with prompt caching enabled
- **Code-specific AI detection** (added 2026-04-15): separate forensic code-authorship prompt (`AI_DETECTION_CODE_PROMPT`) used when file_type is code. Evaluates 6 dimensions (context fit, structural realism, semantic correctness, style fingerprint, engineering realism, consistency). 3+ medium/high signals → escalates to 90%+ AI probability.
- **Prompt compression** (2026-04-15): all prompts in `prompts.py` compressed ~30-40% — cut filler/boilerplate, kept all details and examples
- **Student password auth** (added 2026-04-15): students register with name + password (PBKDF2-SHA256), login with student_id + password. `POST /students/login` endpoint added.
- **MCQ quiz system** (added 2026-04-15): quizzes are now 4-option MCQ with deterministic grading. Anti-hallucination prompt enforces all options grounded in submission text. No LLM call for evaluation.
- **Professor students tab** (enhanced 2026-04-15): click student to expand submissions grouped by assignment, aggregated quiz scores across attempts, per-attempt badges (AI %, confidence, quiz score, style deviation)
- Multi-file upload (up to 10 files) supported on context, analyze, and submit endpoints — form field is `files` (not `file`)
- `call_llm()` handles None responses from free models (returns empty string instead of crashing)
- **Split frontend architecture** (refactored 2026-04-08) — two separate Vite React apps sharing the same design system:
  - **Professor app** (`frontend-professor/`, port 5174): create classes → create assignments → link to class → view roster → upload student previous work for style profiling → compare new submissions → view all submissions with AI/style/confidence badges → run standalone AI detection analysis
  - **Student app** (`frontend-student/`, port 5175): simple name signup (→ unique ID, persisted in localStorage) → join class → select class + assignment → submit files → AI detection results + confidence score → interactive quiz → summary → submission history
  - Original `frontend/` kept for reference but no longer primary
  - Both Vite dev servers proxy `/api/*` to `localhost:8000` — no CORS issues in dev
  - CORS middleware covers ports 5173, 5174, 5175
- **Class & student management** (added 2026-04-08):
  - Students register with just a name (for testing) → get UUID-8 student_id
  - Professor creates classes, students join them
  - Assignments (contexts) are linked to classes
  - Submissions are tracked per-student per-class with full results (AI detection, style analysis, confidence, quiz)
  - All stored in PostgreSQL
- `setup.sh` script for one-command setup on new machines
- No browser extension yet — end goal is Chrome/Firefox extension that intercepts paste/submit on LMS platforms (Canvas, Blackboard, Moodle)
- **Writing style fingerprinting** (implemented 2026-04-06):
  - Hybrid quantitative (~80 metrics) + qualitative (LLM-rated, mini model) style analysis
  - Works for both **prose** (lexical richness, sentence structure, punctuation fingerprint, function word frequencies, readability) and **code** (comment density, naming conventions, line metrics, function decomposition, indent style)
  - Per-student profiles in `style_profiles` table (JSONB) with Welford's online algorithm (incremental O(1) updates)
  - Deviation scoring: z-scores on scalars, cosine distance on vectors, weighted by discriminating power
  - Needs 3+ submissions per student before comparisons are meaningful; minimum 300 words per submission
- **Confidence score formula** (implemented 2026-04-06):
  - `raw = W_AI(0.50) × ai_prob + W_STYLE(0.35) × style_dev + W_TIME(0.15) × time_anomaly`
  - `confidence = raw × (1 - quiz_score × 0.65)` — acing quiz reduces score by up to 65%
  - Thresholds: <0.25 low, 0.25-0.45 moderate, 0.45-0.65 elevated (quiz), 0.65+ high (quiz + flag)
  - `/submit/` now accepts optional `student_id` — auto-runs style analysis and returns confidence score
- **Planned behavioral heuristics** (not yet implemented):
  - **Time-based analysis:** Extension tracks assignment open → submit timestamps; professor sets estimated completion time; flags submissions significantly outside expected range
  - **Quiz-time behavioral monitoring:** Tight time limit on quiz, paste detection on answer fields, tab-switch/focus-loss logging — all feed into confidence score rather than blocking
  - Actively researching more heuristics
- **PostgreSQL migration** (completed 2026-04-08):
  - Migrated all storage from JSON files on disk to PostgreSQL via async SQLAlchemy + asyncpg
  - Tables: students, classes, class_students, class_contexts, contexts, submissions, style_profiles, submission_caches, result_caches, quiz_pools
  - JSONB columns for complex nested data (Welford stats, LLM results, quiz pools)
  - `database.py` — engine, session factory, `get_db()` dependency, `init_db()` lifespan handler
  - `models.py` — all SQLAlchemy ORM models
  - Requires `DATABASE_URL` in `.env` (Supabase or Neon recommended for deployment)
  - Tables auto-created on startup via `create_all`
- Two-person team, `dev` branch not yet created

## Planned improvements — Ipeirotis-inspired (roadmap, not yet implemented)
Inspired by Panos Ipeirotis & Konstantinos Rizakos, "Scalable and Personalized Oral Assessments Using Voice AI" (arXiv:2603.18221, NYU Stern, Fall 2025). Their work: voice-agent oral exams graded by a 3-model "council of LLMs" (Claude + Gemini + GPT) that deliberate and revise. We keep AI Guard async/text-based and LMS-extension-bound — no voice, no scheduled exams — but steal the architectural ideas below.

1. **LLM Council for borderline cases** — currently only Claude judges AI detection. Add a deliberation step: when raw confidence lands in the 0.45–0.65 "elevated" band, fire a council of models, each evaluates independently, then sees others' verdicts **with model identity stripped** (prevents deference bias), then a chairman synthesizes. Adopted from Karpathy's `llm-council` (github.com/karpathy/llm-council) — same 3-stage pattern Ipeirotis uses.
   - **Stages:** (1) independent first opinions, (2) anonymized peer review, (3) chairman synthesis.
   - **Roles:** Sonnet 4.5 = chairman (final synthesis). Haiku 4.5 + Gemini Flash (or a second Anthropic call with different prompt) = council members. Keeps cost low.
   - **Where:** `services/llm.py` — new `call_llm_council()` that takes initial verdict + evidence, runs the 3 stages. Triggered from `routers/submit.py` after confidence is computed, before save.
   - **Cost:** only fires on ambiguous submissions; clean and clearly-AI submissions skip it.
   - **Win:** defensible accuracy on the cases that would otherwise false-flag a real student or miss a cheater. If council splits, surface "models disagreed" to professor rather than forcing a verdict.
   - **Open question:** use OpenRouter for multi-provider access (one key, one bill, loses Anthropic-native prompt caching) vs. direct SDKs per provider (keeps caching, more integration work). Defer until implementation.

2. **Adaptive follow-up question** — MCQs are static; a lucky-guess student aces 3 and walks. Add one generated follow-up that reads the student's actual answer pattern (including which wrong options they picked) and probes the specific misconception. Still MCQ, still deterministic grading. Fires only if submission already flagged OR answer pattern is suspicious (too fast, unusual correct/incorrect mix).
   - **Where:** `routers/quiz.py` — new `/quiz/followup` endpoint taking prior answers + submission + context, generates one targeted MCQ.
   - **Why it breaks cheating:** an AI-authored submission can be quiz-aced via copy-paste, but a question grounded in *their specific wrong answers* requires real comprehension.

3. **Open-response tier for red-flag submissions** — Ipeirotis uses open-response for everyone (via voice); we use MCQ (cheap). Don't pick — pyramid:
   - Tier 1 (everyone): MCQ, deterministic, free on retries.
   - Tier 2 (flagged, confidence > 0.65): one short-answer question, graded by LLM council.
   - Tier 3 (disputed): professor-reviewed with full evidence trail.
   - **Where:** new `routers/openresponse.py`, triggered from `submit.py` when confidence threshold crossed.
   - **Pitch:** "we burn open-response budget only on the 10% that matter."

4. **Structured evidence report (first-class object)** — 8-layer detection already produces evidence but it's buried in the response. Surface it: each layer → claim → literal quote from submission → confidence. Professors skim in 30 seconds and can defend a flag to a student.
   - **Where:** `schemas.py` — new `EvidenceReport` model. `prompts.py` — tighten AI detection prompt output format to enforce per-layer evidence with quotes.
   - **Moat:** a "72% confidence" number doesn't survive a student challenge. A quoted evidence report does. This is our differentiator vs. GPTZero.

**Implementation order when limit resets:** #1 first (1 day, uses existing infra, enables #3). Then #4 (schema + prompt tightening). Then #2 and #3 together (both build on follow-up-question infra).

**Reference artifacts (not a full repo — just prompts):**
- Voice agent prompt: https://gist.github.com/ipeirotis/0d9d5747e6270cf6d65a6bf9d162e421
- Grading council prompt: https://gist.github.com/ipeirotis/99418caa6afae72fb7eec63855632c68
- Karpathy's llm-council pattern: https://github.com/karpathy/llm-council

## Design decisions
- Context (assignment spec) is a first-class object — stored once, referenced by ID everywhere
- AI detection uses heuristic prompt engineering, not a third-party detection API
- The 8-layer detection prompt checks: content inflation, AI vocabulary, grammar tells, formatting tells, chatbot artifacts, "soulless but clean" test, code-specific signals, writing style comparison (Layer 8)
- Code submissions use a separate forensic code-authorship prompt (`AI_DETECTION_CODE_PROMPT`) with 6 analysis dimensions and automatic escalation (3+ medium/high signals → 90%+ probability)
- Quiz questions are grounded in the assignment spec so they test real understanding, not trivia
- Summary mode is an alternative to quiz — instructor chooses which mode to use
- Style-aware AI detection: when a student has a style profile, their `style_summary` is injected into the AI detection prompt so the LLM can compare the submission against the student's known writing patterns. The summary is auto-generated from accumulated qualitative data (no extra LLM call).

## Git workflow
- `main` — stable, deployable
- `dev` — integration branch
- Feature branches: `<name>/<feature>` (e.g. `hridyansh/quiz-endpoint`)
- PRs go to `dev` first, then `dev` → `main`

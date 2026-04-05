# Intel Guard

## What this project is
Academic integrity platform — detects AI-generated submissions and verifies student comprehension through quizzes and summaries. Local Python backend now, browser extension later.

## Tech stack
- **Backend:** Python, FastAPI, uvicorn
- **Frontend:** React (Vite), React Router — dark theme with blue accent
- **LLM:** Provider-agnostic (OpenAI/Anthropic/Gemini) — configured via `.env`
- **PDF parsing:** pdfplumber
- **Config:** pydantic-settings, python-dotenv
- **Storage:** JSON files on disk (context_store/, submission_cache/, result_cache/)

## How to run
```bash
# Backend
cp .env.example .env  # fill in API key
pip install -r requirements.txt
uvicorn backend.main:app --reload
# Swagger docs at http://localhost:8000/docs

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

## Project structure
```
frontend/                  # React SPA (Vite)
├── src/
│   ├── main.jsx           # Entry point with BrowserRouter
│   ├── App.jsx            # Nav + routes (/, /professor, /student)
│   ├── api.js             # All API calls (proxied to localhost:8000)
│   ├── index.css          # Global styles, dark theme, CSS variables
│   └── pages/
│       ├── Landing.jsx    # Role selection (Professor / Student)
│       ├── Professor.jsx  # Upload assignments, run AI detection analysis
│       └── Student.jsx    # Submit work, interactive quiz, summary view
backend/
├── main.py              # FastAPI app entrypoint
├── config.py            # Settings from .env
├── schemas.py           # All Pydantic request/response models
├── prompts.py           # All LLM system prompts (shared across routers)
├── routers/
│   ├── context.py       # Upload assignment specs (the "context")
│   ├── analyze.py       # AI detection with 7-layer heuristic prompt
│   ├── quiz.py          # Generate + evaluate comprehension questions (evaluate uses mini model)
│   ├── summary.py       # Comprehension-focused submission walkthrough
│   └── submit.py        # Combined endpoint — orchestrates detect → quiz/summary in one call
└── services/
    ├── llm.py           # LLM abstraction — async, dual models, JSON retry, client caching
    ├── extractor.py     # PDF, code, and text file extraction (with caching)
    ├── context_store.py # JSON file storage for assignment specs (with ID validation)
    ├── submission_cache.py # Caches extracted text by content hash
    └── result_cache.py    # Caches LLM responses (analyze, quiz pool, summary) by context+submission hash
```

## Key concepts
- **Context** = assignment specification. Uploaded first, referenced by `context_id` in all subsequent calls. Every LLM call gets the assignment spec injected into the system prompt so questions/analysis are grounded in what was actually assigned.
- **Analyze** = AI detection. Uses a 7-layer prompt checking content-level, word-level, grammar, formatting, communication artifacts, "soulless but clean" test, and code-specific signals.
- **Quiz** = comprehension verification. Two-step: generate questions, then evaluate student answers.
- **Summary** = comprehension walkthrough. Student-friendly, structured so they can't just scroll past.

## Cost optimizations
- **Dual-model routing:** Primary model for detection, quiz generation, summary. Mini model for evaluating quiz answers — the most frequent call (~3× per submission). Currently using free OpenRouter models (see `.env`).
- **Submission caching:** Extracted text is cached by SHA-256 hash. Re-uploading the same file (retries) skips extraction entirely.
- **Optional AI detection:** `POST /submit/` accepts `skip_detection=True` for quiz-everyone mode. Saves one full primary-model call per submission (~20% cost reduction).
- **LLM result caching (`result_cache.py`):** Caches LLM responses on disk keyed by `hash(context_id + submission_text + operation)`. Analyze, quiz, and summary results are all cached — same submission against the same assignment never triggers a repeat LLM call. Cache is shared across endpoints (e.g., `/analyze/` and `/submit/` hit the same cache key for detection).
- **Quiz question pool with exhaustion refresh:** Instead of generating `num_questions` per attempt, the first call generates `num_questions * 4` (e.g., 12 for a 3-question quiz) and caches the pool. Each retry serves unseen questions only — tracked via `served_indices` in the cache file. When all questions have been served (e.g., after 4 attempts of 3 questions from a pool of 12), the pool is automatically deleted and a fresh batch of 12 is generated from the LLM. Cost overhead is ~10-15% extra output tokens per pool generation; all attempts within a pool are free.

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
- Use `use_mini=True` for high-frequency, simpler LLM tasks (answer evaluation)
- All LLM system prompts live in `prompts.py` — routers import from there, never define prompts inline
- File extraction always goes through `services/extractor.py`
- Accepts any file type: PDF, code files (.py, .js, .java, .cpp, etc.), plain text
- `context_id` and cache keys are validated with a regex allowlist (hex + hyphens only) to prevent path traversal

## API endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/context/` | Upload 1-10 assignment spec files (PDF/code/text) → returns `context_id` |
| GET | `/context/` | List all stored contexts |
| GET | `/context/{id}` | Get a specific context |
| POST | `/analyze/` | Upload 1-10 submission files + `context_id` → AI detection (7-layer) |
| POST | `/quiz/generate` | Submission text + `context_id` → comprehension questions |
| POST | `/quiz/evaluate` | Student answer + question + context → pass/fail (uses mini model) |
| POST | `/summary/` | Submission text + `context_id` → comprehension walkthrough |
| POST | `/submit/` | Combined endpoint: 1-10 files, detect (optional) → quiz/summary in one call |

## Current status
- Backend is functional and tested (2026-03-24) — analyze, submit, quiz generate all confirmed working
- Using OpenRouter with free models: `z-ai/glm-4.5-air:free` (primary) and `nvidia/nemotron-3-nano-30b-a3b:free` (mini)
- Multi-file upload (up to 10 files) supported on context, analyze, and submit endpoints — form field is `files` (not `file`)
- `call_llm()` handles None responses from free models (returns empty string instead of crashing)
- **React frontend** at `frontend/` — two views: Professor (upload assignments, analyze submissions) and Student (submit work, interactive quiz with live evaluation, summary review). Proxied via Vite to backend at `localhost:8000`
- No browser extension yet — end goal is Chrome/Firefox extension that intercepts paste/submit on LMS platforms (Canvas, Blackboard, Moodle)
- Two-person team, `dev` branch not yet created

## Design decisions
- Context (assignment spec) is a first-class object — stored once, referenced by ID everywhere
- AI detection uses heuristic prompt engineering, not a third-party detection API
- The 7-layer detection prompt checks: content inflation, AI vocabulary, grammar tells, formatting tells, chatbot artifacts, "soulless but clean" test, code-specific signals
- Quiz questions are grounded in the assignment spec so they test real understanding, not trivia
- Summary mode is an alternative to quiz — instructor chooses which mode to use

## Git workflow
- `main` — stable, deployable
- `dev` — integration branch
- Feature branches: `<name>/<feature>` (e.g. `hridyansh/quiz-endpoint`)
- PRs go to `dev` first, then `dev` → `main`

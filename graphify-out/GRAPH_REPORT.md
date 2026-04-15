# Graph Report - .  (2026-04-13)

## Corpus Check
- Corpus is ~38,002 words - fits in a single context window. You may not need a graph.

## Summary
- 325 nodes · 410 edges · 45 communities detected
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.58)
- Token cost: 4,200 input · 2,800 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Class & Submission API|Class & Submission API]]
- [[_COMMUNITY_Style Analyzer (Metrics)|Style Analyzer (Metrics)]]
- [[_COMMUNITY_Frontend API Clients|Frontend API Clients]]
- [[_COMMUNITY_Design Docs & Assets|Design Docs & Assets]]
- [[_COMMUNITY_Database Layer|Database Layer]]
- [[_COMMUNITY_Student Dashboard UI|Student Dashboard UI]]
- [[_COMMUNITY_Confidence & Deviation Scoring|Confidence & Deviation Scoring]]
- [[_COMMUNITY_Backend Architecture Overview|Backend Architecture Overview]]
- [[_COMMUNITY_Professor Dashboard UI|Professor Dashboard UI]]
- [[_COMMUNITY_Class Store Service|Class Store Service]]
- [[_COMMUNITY_Student Flow Components|Student Flow Components]]
- [[_COMMUNITY_Runtime & Infrastructure|Runtime & Infrastructure]]
- [[_COMMUNITY_Result Cache & Quiz Pool|Result Cache & Quiz Pool]]
- [[_COMMUNITY_LLM Service Abstraction|LLM Service Abstraction]]
- [[_COMMUNITY_File Extractor|File Extractor]]
- [[_COMMUNITY_Submission Cache|Submission Cache]]
- [[_COMMUNITY_Style Store Service|Style Store Service]]
- [[_COMMUNITY_Student Store Service|Student Store Service]]
- [[_COMMUNITY_Context Store Service|Context Store Service]]
- [[_COMMUNITY_Submission Store Service|Submission Store Service]]
- [[_COMMUNITY_Config Settings|Config Settings]]
- [[_COMMUNITY_Routers Context|Routers: Context]]
- [[_COMMUNITY_Routers Analyze|Routers: Analyze]]
- [[_COMMUNITY_Routers Quiz|Routers: Quiz]]
- [[_COMMUNITY_Routers Summary|Routers: Summary]]
- [[_COMMUNITY_Routers Submit|Routers: Submit]]
- [[_COMMUNITY_Routers Style|Routers: Style]]
- [[_COMMUNITY_Routers Students|Routers: Students]]
- [[_COMMUNITY_Routers Classes|Routers: Classes]]
- [[_COMMUNITY_Routers Submissions|Routers: Submissions]]
- [[_COMMUNITY_Prompts Module|Prompts Module]]
- [[_COMMUNITY_Schemas Module|Schemas Module]]
- [[_COMMUNITY_Legacy Frontend|Legacy Frontend]]
- [[_COMMUNITY_Student App Entry|Student App Entry]]
- [[_COMMUNITY_Professor App Entry|Professor App Entry]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Setup Script|Setup Script]]
- [[_COMMUNITY_Misc Fragment A|Misc Fragment A]]
- [[_COMMUNITY_Misc Fragment B|Misc Fragment B]]
- [[_COMMUNITY_Misc Fragment C|Misc Fragment C]]
- [[_COMMUNITY_Misc Fragment D|Misc Fragment D]]
- [[_COMMUNITY_Misc Fragment E|Misc Fragment E]]
- [[_COMMUNITY_Misc Fragment F|Misc Fragment F]]
- [[_COMMUNITY_Misc Fragment G|Misc Fragment G]]
- [[_COMMUNITY_Misc Fragment H|Misc Fragment H]]

## God Nodes (most connected - your core abstractions)
1. `request()` - 27 edges
2. `analyze_style()` - 13 edges
3. `Base` - 11 edges
4. `AI Guard Platform` - 6 edges
5. `7-Layer AI Detection Prompt` - 6 edges
6. `Comprehension Quiz System` - 6 edges
7. `FastAPI Backend (Port 8000)` - 6 edges
8. `StyleProfile` - 5 edges
9. `_pool_key()` - 5 edges
10. `extract_text()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `AI Guard App Logo (Lightning Bolt, Purple Brand Identity)` --conceptually_related_to--> `AI Guard Platform`  [INFERRED]
  frontend/public/favicon.svg → README.md
- `Hero Image (Stacked Layers / Abstraction Visual)` --conceptually_related_to--> `AI Guard Platform`  [INFERRED]
  frontend/src/assets/hero.png → README.md
- `Submission Flow Flowchart (Extension → Trigger Check → Backend Flag → Quiz/Summary)` --references--> `Behavioral Heuristics System`  [EXTRACTED]
  public/flowchart.png → README.md
- `Submission Flow Flowchart (Extension → Trigger Check → Backend Flag → Quiz/Summary)` --references--> `7-Layer AI Detection Prompt`  [EXTRACTED]
  public/flowchart.png → README.md
- `Submission Flow Flowchart (Extension → Trigger Check → Backend Flag → Quiz/Summary)` --references--> `Comprehension Quiz System`  [EXTRACTED]
  public/flowchart.png → README.md

## Hyperedges (group relationships)
- **Confidence Score: AI Detection + Style Deviation + Quiz Reduction** — readme_ai_detection_7layer, readme_style_fingerprinting, readme_confidence_score_formula [EXTRACTED 1.00]
- **Cost Optimization: Dual-Model Routing + Result Cache + Quiz Pool** — readme_dual_model_routing, readme_result_cache, readme_quiz_pool_caching [EXTRACTED 1.00]
- **Submit Endpoint Orchestrates Detection + Style + Quiz/Summary** — claudemd_router_submit, claudemd_router_analyze, claudemd_router_quiz [EXTRACTED 1.00]

## Communities

### Community 0 - "Class & Submission API"
Cohesion: 0.09
Nodes (17): BaseModel, AddContextRequest, CreateClassRequest, JoinClassRequest, UpdateContextSettingsRequest, AnalyzeResponse, ContextResponse, EvaluateRequest (+9 more)

### Community 1 - "Style Analyzer (Metrics)"
Cohesion: 0.09
Nodes (30): analyze_style(), _code_metrics(), _empty_code_metrics(), _extract_comment_text(), _function_word_frequencies(), get_scalar_metrics(), get_vector_metrics(), _is_code() (+22 more)

### Community 2 - "Frontend API Clients"
Cohesion: 0.16
Nodes (25): addContextToClass(), analyzeSubmission(), compareStyle(), createClass(), createContext(), evaluateAnswer(), getClass(), getClassStudents() (+17 more)

### Community 3 - "Design Docs & Assets"
Cohesion: 0.11
Nodes (28): Design Decision: Heuristic Prompt Engineering (No Third-Party API), services/extractor.py (File Extraction + Caching), AI Guard App Logo (Lightning Bolt, Purple Brand Identity), Submission Flow Flowchart (Extension → Trigger Check → Backend Flag → Quiz/Summary), Hero Image (Stacked Layers / Abstraction Visual), Academic Integrity Problem (False Positives, Arms Race), 7-Layer AI Detection Prompt, AI Guard Platform (+20 more)

### Community 4 - "Database Layer"
Cohesion: 0.2
Nodes (16): Base, Base, get_db(), init_db(), FastAPI dependency — yields an async session., Create all tables. Called once on startup., DeclarativeBase, Class (+8 more)

### Community 5 - "Student Dashboard UI"
Cohesion: 0.14
Nodes (0): 

### Community 6 - "Confidence & Deviation Scoring"
Cohesion: 0.23
Nodes (10): _build_style_summary(), compute_deviation(), _cosine_distance(), get_profile(), Per-student writing style profile storage (PostgreSQL).  Uses Welford's online a, Build a human-readable writing style summary from accumulated qualitative data., _serialize(), update_profile() (+2 more)

### Community 7 - "Backend Architecture Overview"
Cohesion: 0.18
Nodes (12): backend/main.py (FastAPI Entrypoint), backend/models.py (SQLAlchemy ORM Models), backend/prompts.py (All LLM System Prompts), PostgreSQL Tables (10 tables, JSONB columns), routers/analyze.py (AI Detection Router), routers/quiz.py (Quiz Generate + Evaluate), routers/style.py (Style Fingerprinting Router), routers/submit.py (Combined Submission Router) (+4 more)

### Community 8 - "Professor Dashboard UI"
Cohesion: 0.18
Nodes (0): 

### Community 9 - "Class Store Service"
Cohesion: 0.33
Nodes (7): add_context_to_class(), get_class(), get_classes_for_student(), join_class(), list_classes(), _serialize(), update_context_settings()

### Community 10 - "Student Flow Components"
Cohesion: 0.22
Nodes (0): 

### Community 11 - "Runtime & Infrastructure"
Cohesion: 0.25
Nodes (9): Vite + React Frontend Template, FastAPI Backend (Port 8000), Professor Frontend App (Port 5174), Student Frontend App (Port 5175), asyncpg (PostgreSQL Driver), FastAPI, SQLAlchemy (Async ORM), Uvicorn (ASGI Server) (+1 more)

### Community 12 - "Result Cache & Quiz Pool"
Cohesion: 0.46
Nodes (7): get_cached_result(), get_quiz_pool(), _make_key(), pick_from_pool(), _pool_key(), save_quiz_pool(), save_result()

### Community 13 - "LLM Service Abstraction"
Cohesion: 0.36
Nodes (7): call_llm(), call_llm_json(), _call_llm_sync(), _get_anthropic_client(), _get_openai_client(), Async entry point for all LLM calls. Runs blocking SDK calls in a thread pool., Call LLM and parse response as JSON, with retry on parse failure.

### Community 14 - "File Extractor"
Cohesion: 0.43
Nodes (6): _extract_pdf(), extract_text(), extract_text_multi(), get_file_type(), Returns (extracted_text, file_type). Uses cache to skip re-extraction on retries, Extract and concatenate text from multiple files (up to 10).     Returns (combin

### Community 15 - "Submission Cache"
Cohesion: 0.33
Nodes (7): OpenRouter Free Models (glm-4.5-air primary, nemotron-nano mini), services/llm.py (LLM Abstraction Layer), Dual-Model LLM Routing (Primary + Mini), LLM-Agnostic Architecture (OpenAI/Anthropic/Gemini), Anthropic SDK, Google Generative AI SDK, OpenAI SDK

### Community 16 - "Style Store Service"
Cohesion: 0.33
Nodes (1): App()

### Community 17 - "Student Store Service"
Cohesion: 0.33
Nodes (0): 

### Community 18 - "Context Store Service"
Cohesion: 0.47
Nodes (3): compare_submission(), _run_qualitative_analysis(), update_student_style()

### Community 19 - "Submission Store Service"
Cohesion: 0.6
Nodes (5): get_submission(), list_submissions(), save_submission(), _serialize(), update_submission_quiz()

### Community 20 - "Config Settings"
Cohesion: 0.4
Nodes (1): RegisterRequest

### Community 21 - "Routers: Context"
Cohesion: 0.5
Nodes (3): BaseSettings, Config, Settings

### Community 22 - "Routers: Analyze"
Cohesion: 0.5
Nodes (0): 

### Community 23 - "Routers: Quiz"
Cohesion: 0.5
Nodes (0): 

### Community 24 - "Routers: Summary"
Cohesion: 0.83
Nodes (3): get_cached(), _hash_content(), save_to_cache()

### Community 25 - "Routers: Submit"
Cohesion: 0.5
Nodes (0): 

### Community 26 - "Routers: Style"
Cohesion: 0.67
Nodes (0): 

### Community 27 - "Routers: Students"
Cohesion: 0.67
Nodes (0): 

### Community 28 - "Routers: Classes"
Cohesion: 0.67
Nodes (0): 

### Community 29 - "Routers: Submissions"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Prompts Module"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Schemas Module"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Legacy Frontend"
Cohesion: 1.0
Nodes (2): Design Decision: Context as First-Class Object, Context (Assignment Specification Object)

### Community 33 - "Student App Entry"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Professor App Entry"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Vite Config"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Setup Script"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Misc Fragment A"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Misc Fragment B"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Misc Fragment C"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Misc Fragment D"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Misc Fragment E"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Misc Fragment F"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Misc Fragment G"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Misc Fragment H"
Cohesion: 1.0
Nodes (1): Social/UI Icon Set (Bluesky, Discord, GitHub, X, Social, Documentation)

## Knowledge Gaps
- **40 isolated node(s):** `Config`, `FastAPI dependency — yields an async session.`, `Create all tables. Called once on startup.`, `Async entry point for all LLM calls. Runs blocking SDK calls in a thread pool.`, `Call LLM and parse response as JSON, with retry on parse failure.` (+35 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Routers: Submissions`** (2 nodes): `submit.py`, `submit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Prompts Module`** (2 nodes): `summary.py`, `summarize_submission()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Schemas Module`** (2 nodes): `analyze_submission()`, `analyze.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Legacy Frontend`** (2 nodes): `Design Decision: Context as First-Class Object`, `Context (Assignment Specification Object)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Student App Entry`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Professor App Entry`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Setup Script`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Fragment A`** (1 nodes): `prompts.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Fragment B`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Fragment C`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Fragment D`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Fragment E`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Fragment F`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Fragment G`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Fragment H`** (1 nodes): `Social/UI Icon Set (Bluesky, Discord, GitHub, X, Social, Documentation)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Writing Style Fingerprinting` connect `Design Docs & Assets` to `Backend Architecture Overview`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `Base` (e.g. with `ClassContext` and `Student`) actually correct?**
  _`Base` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Config`, `FastAPI dependency — yields an async session.`, `Create all tables. Called once on startup.` to the rest of the system?**
  _40 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Class & Submission API` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Style Analyzer (Metrics)` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Design Docs & Assets` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Student Dashboard UI` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
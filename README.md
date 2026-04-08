# AI Guard

**Don't block AI. Help students grow with it.**

AI Guard is an academic integrity platform that ensures students actually learn from the work they submit. Delivered as a lightweight browser extension on learning management systems (Canvas, Blackboard, Moodle), it uses behavioral heuristics to identify when a student might need a comprehension check — and then turns that moment into a learning opportunity, not a punishment.

---

## The Problem

Universities are spending millions trying to catch AI-generated submissions after the fact. Current solutions are still failing

- **AI detectors** (Turnitin, GPTZero) produce false positives, penalizing honest students and creating legal liability for institutions.
- **Honor codes** rely on trust in an era where AI tools exist, instant, and are increasingly undetectable.
- **Exam proctoring** (Respondus, Proctorio, HonorLock) only covers exams — not homework, essays, coding assignments, or lab reports where most AI usage actually happens.

The result: faculty distrust student work, students distrust detection tools, and universities are stuck in an arms race they can't win.

---

## The Solution

AI Guard takes a fundamentally different approach. We don't try to catch students — we make sure they're learning. Instead of banning AI or accusing students after the fact, AI Guard uses multiple behavioral signals to decide when a comprehension check would be valuable, and then gives the student a chance to demonstrate understanding.

### How It Works

1. **Student installs the extension** — mandated by the university, free for students, available on Chrome, Edge, and Firefox.
2. **Extension activates on LMS domains** — it only runs on authorized education platforms (Canvas, Blackboard, Moodle). It does nothing on other websites.
3. **Behavioral heuristics run in the background** — the system monitors multiple signals (paste events, completion time, writing style consistency) to build a confidence score for each submission. No single signal triggers anything on its own.
4. **If heuristics flag a submission, a comprehension check is offered** — this is not an accusation. It's a short, AI-generated quiz grounded in the assignment content. For example:
   - Submitted a Python function? Explain what the base case of the recursion does.
   - Submitted an essay paragraph about the Cold War? Identify the thesis and one supporting argument.
   - Submitted a chemistry formula derivation? Solve a slight variation of the same problem.
   - The professor can also add custom questions, which the AI evaluates based on the student's response.
5. **Strong quiz performance reduces the flag** — if a student is flagged at, say, 20% concern weight but demonstrates clear understanding on the quiz, that weight drops (e.g., to 7%). Proving comprehension is the fastest way to clear any concern. The system rewards understanding.
6. **No single report determines anything** — professors see a dashboard of trends over time, not isolated incidents. A single flag is context, not a verdict. Multiple flags across assignments with poor quiz performance might warrant a conversation — but even then, the goal is to help the student engage with the material, not to punish them.
7. **Alternative to quizzing** — if the professor prefers, students can instead read through an AI-generated explanation of their submission, reinforcing their understanding without the pressure of a quiz.

### Key Differentiator

AI Guard does not ban AI. It does not accuse students of cheating. It exists because we believe students deserve to actually understand what they submit — and that AI can be a powerful learning tool when paired with real comprehension. The platform makes sure students get the most out of their education, whether they use AI or not.

---

## Target Audience

**Primary buyer:** University administrators, provost offices, and academic integrity committees looking for scalable, institution-wide solutions that go beyond unreliable AI detection.

**Secondary stakeholders:**

- **Faculty** — get a dashboard showing comprehension trends per assignment, per student, and per course. See patterns over time, not isolated incidents. Make informed decisions about who needs support.
- **IT departments** — lightweight deployment via managed browser policies (Intune, Jamf, Google Workspace Admin). No custom infrastructure required.
- **Students** — only get quizzed when it matters, and strong performance actively clears flags. The comprehension checks double as study reinforcement — students who engage with them actually learn more.

---

## Technical Architecture

![AI Guard Flow](IMG_6229.png)

### What's Built Now

- **Python FastAPI backend** with async SQLAlchemy + PostgreSQL (Neon):
  - Upload assignment specs (the "context" that grounds all AI calls)
  - AI detection using a 7-layer heuristic prompt + **Layer 8: writing style comparison** (when student profile exists, the LLM compares the submission against the student's known writing patterns)
  - Comprehension quiz generation + answer evaluation
  - Submission summarization as an alternative to quizzing
  - Combined `/submit` endpoint that orchestrates the full flow in one call
  - Writing style fingerprinting with per-student profiles (~80 quantitative metrics + LLM qualitative analysis)
  - Class & student management — professors create classes, students join, assignments are linked per-class
  - Per-assignment `skip_detection` toggle controlled by professors
  - Full submission history with AI detection, style analysis, confidence scores, and quiz results
- **Split frontend** — two separate React (Vite) apps:
  - **Professor app** (port 5174) — class management, assignment creation, student roster, style profiling, submission review with badges, standalone AI analysis with optional student selection for style-aware detection
  - **Student app** (port 5175) — signup, join classes, submit work, quiz/summary, submission history
- **LLM-agnostic** — swap between OpenAI, Anthropic, or Gemini by changing one `.env` variable
- **Cost-optimized** — dual-model routing (primary model for detection/generation, mini model for evaluation), submission caching, result caching, quiz pool reuse, optional AI detection skip
- **PostgreSQL storage** — all data in Neon Postgres (10 tables), JSONB for complex nested data (style profiles, LLM results)

### Planned (Extension + Cloud)

- **Content Script** — injected on whitelisted LMS domains. Monitors paste events on assignment submission forms and intercepts the submit action.
- **Popup UI** — shows the student their comprehension check status and history.
- **Background Service Worker** — handles communication with the AI Guard backend, manages auth tokens, and caches quiz state.
- **LMS Gating Token** — the extension injects a verification header/token that the LMS (configured by the university) requires for submission access. No extension = no submission.
- **LMS Integration Layer** — connects via LTI 1.3 and Canvas/Blackboard REST APIs for assignment metadata, course info, and grade passback.
- **Analytics Pipeline** — aggregates anonymized comprehension data for instructor and admin dashboards.
- **Auth Service** — university SSO integration (SAML 2.0, OAuth 2.0) so students log in with existing campus credentials.

### Behavioral Heuristics

AI Guard doesn't quiz every student on every submission — that would be exhausting and counterproductive. Instead, the system runs behavioral heuristics in the background and only triggers a comprehension check when the combination of signals suggests it would be valuable. Think of it as a smart filter: most submissions pass through without interruption, and the ones that get flagged receive a learning opportunity, not an accusation.

Each heuristic contributes a weighted confidence score. No single heuristic can trigger a quiz on its own. And if a student is flagged but demonstrates strong comprehension on the quiz, the flag weight is actively reduced — the system learns that this student understands their work, and adjusts accordingly.

#### 1. AI Detection (7-Layer Prompt Analysis)

The first signal. A purpose-built prompt runs the submission through seven detection layers: content-level red flags, AI-signature vocabulary, grammar/structure tells, formatting tells, chatbot communication artifacts, the "soulless but clean" test, and code-specific signals. Returns an `ai_probability` (0.0–1.0).

This is the existing `/analyze/` endpoint. It contributes the largest weight (50%) to the confidence score but is never a verdict on its own.

#### 2. Time-Based Analysis (Planned — Extension Required)

For an assignment that should take two weeks, submitting a polished solution minutes after opening it is worth a second look. AI Guard tracks the time between when a student first accesses an assignment and when they submit it.

- **Professor sets an estimated completion time** — when creating an assignment, the instructor provides a reasonable time estimate (e.g., "this should take 8–12 hours of work over two weeks").
- **Extension records timestamps** — the browser extension logs when the student first opens the assignment page and when they submit.
- **Heuristic comparison** — if a student's completion time falls significantly outside the expected range (e.g., a 12-hour assignment completed in 45 minutes), it adds weight to the confidence score. The system uses a configurable tolerance range to account for naturally faster or slower students.

This doesn't prove anything on its own — a fast student might genuinely be that fast. It's one data point among many.

#### 3. Writing Style Fingerprinting (Implemented)

Every student writes differently — both in prose and in code. Over time, AI Guard builds a per-student writing profile — a fingerprint of their natural style — and notices when a submission deviates significantly from it.

**How it works:**

The system uses a **hybrid approach** combining ~80 quantitative metrics computed directly in Python (zero LLM cost) with qualitative LLM analysis (mini model, cheap).

**Quantitative metrics (computed instantly, no LLM):**

For **prose** submissions:
- **Lexical richness** — Type-token ratio (vocabulary diversity), hapax legomena ratio (words used only once), Yule's K (length-independent richness), average word length, word length distribution, advanced vocabulary ratio
- **Sentence structure** — Mean sentence length, sentence length standard deviation (AI text has notably LOW variance — one of the strongest signals), sentence length distribution, question/exclamation ratios
- **Punctuation fingerprint** — Frequency per 1000 words of: commas, semicolons, colons, em-dashes, parentheses, quotation marks, ellipses. Every person has a distinctive punctuation fingerprint — this is one of the strongest stylometric signals in the literature.
- **Function word frequencies** — The top 50 English function words (the, of, and, a, to, in...) measured per 1000 words. This is the backbone of Burrows' Delta, the gold standard in computational stylometry since 2002. Consistently the single most powerful feature family for authorship attribution.
- **Readability** — Flesch-Kincaid Grade Level, Automated Readability Index
- **Paragraph structure** — Paragraph count, mean paragraph length, bullet/heading usage

For **code** submissions:
- **Comment density** — Comment lines / total lines
- **Line metrics** — Average line length, line length standard deviation, blank line ratio
- **Naming conventions** — snake_case vs camelCase vs PascalCase ratios, average identifier length. A student who always writes `index` suddenly using `idx` is a signal.
- **Function decomposition** — Average function length, function count
- **Indentation style** — Tabs vs spaces, indent width

**Qualitative analysis (LLM-based, uses mini model):**

A structured "Linguistically Informed Prompt" rates 10 dimensions on a 1-5 scale:

For prose: formality, confidence, complexity, conciseness, voice, perspective, argument style, explanation pattern, transition style, quirks — plus top 5 characteristic phrases and an overall impression.

For code: formality (hacky → production-grade), confidence (defensive → assertive), complexity (linear → abstracted), conciseness (verbose → terse), voice (textbook → personal), decomposition style, naming style, comment style, error handling, quirks — plus top 5 code patterns.

**Profile storage:**

Each student gets a profile in the `style_profiles` PostgreSQL table (JSONB columns). Metrics are updated incrementally using **Welford's online algorithm** — a mathematically exact method for computing running mean and variance in O(1) per update. No old submissions are ever reprocessed. The profile just gets more accurate with each new submission.

After **3 submissions**, the system has enough data to start comparing. The more submissions, the tighter the baseline becomes.

**Deviation scoring:**

When a new submission comes in, each metric is compared against the student's historical profile:

- **Scalar metrics** — z-score against the running mean/variance, weighted by discriminating power (function word frequencies weighted 3x, sentence length variance weighted 2.5x, punctuation weighted 2x, etc.)
- **Vector metrics** — Cosine distance between the new submission's function word vector and the profile's mean vector
- **Qualitative dimensions** — Score delta against historical mean on each 1-5 dimension

The result is a **style deviation score** from 0.0 (matches profile perfectly) to 1.0 (completely different writer). The system also reports the top 5 most deviant metrics so professors can see exactly what changed.

#### The Confidence Score Formula

Here's how all the signals combine into a single number.

**Formula:**

```
raw_score = (W_AI × ai_probability) + (W_STYLE × style_deviation) + (W_TIME × time_anomaly)
                    ↓                          ↓                           ↓
                normalized by              normalized by               normalized by
              active weights             active weights             active weights

confidence_score = raw_score × (1 - quiz_reduction)
```

**Where:**
- `ai_probability` = AI detection score from the 7-layer analysis (0.0–1.0)
- `style_deviation` = Writing style deviation from the student's historical profile (0.0–1.0)
- `time_anomaly` = How far outside the expected completion time (0.0–1.0) [planned — extension required]
- `quiz_reduction` = `quiz_score × 0.65` — acing the quiz reduces the score by up to 65%

**Default weights:**

| Signal | Weight | Status |
|--------|--------|--------|
| AI Detection (`W_AI`) | 0.50 | Implemented |
| Writing Style (`W_STYLE`) | 0.35 | Implemented |
| Time Analysis (`W_TIME`) | 0.15 | Planned |
| Quiz Reduction | up to -65% | Implemented |

Weights are normalized by active signals — if time analysis isn't available yet, AI detection and style deviation are renormalized to fill the full weight.

**Threshold classification:**

| Confidence Score | Level | Action |
|-----------------|-------|--------|
| 0.00 – 0.25 | Low | No flag, no quiz |
| 0.25 – 0.45 | Moderate | Logged for trend tracking, no quiz |
| 0.45 – 0.65 | Elevated | Quiz triggered |
| 0.65 – 1.00 | High | Quiz triggered, flagged for review |

**Example scenarios:**

| Scenario | AI Prob | Style Dev | Quiz Score | Final Score | Result |
|----------|---------|-----------|------------|-------------|--------|
| Original work, consistent style | 0.15 | 0.10 | — | 0.13 | Low — no flag |
| AI-detected but student style matches | 0.70 | 0.10 | — | 0.45 | Elevated — quiz triggered |
| Same student aces the quiz | 0.70 | 0.10 | 0.90 | 0.16 | Low — flag cleared |
| AI-detected AND style shifted | 0.75 | 0.70 | — | 0.73 | High — flagged for review |
| Style shifted, aces quiz anyway | 0.75 | 0.70 | 1.00 | 0.25 | Low — comprehension proven |
| No AI flags, sudden style change | 0.10 | 0.80 | — | 0.39 | Moderate — logged, no quiz |
| New student (< 3 submissions) | 0.60 | N/A | — | 0.60 | Elevated — quiz (AI-only score) |

**The key insight:** Strong quiz performance is the fastest way to clear any flag. A student who understands their work — regardless of whether they used AI to help write it — should be able to demonstrate that understanding. The system rewards comprehension, not punishment.

Here's how the pieces fit together:

- Each heuristic contributes a **weighted score** to the overall confidence level for a submission.
- When the combined score crosses a threshold, the student receives a comprehension check (quiz or summary walkthrough).
- **Strong quiz performance reduces the flag weight** — for example, a submission flagged at 20% concern that the student aces on the quiz might drop to 7%. The system actively rewards demonstrated understanding.
- **Professors see trends, not isolated incidents** — the instructor dashboard shows patterns over time. A single flag on one assignment is context, not a conclusion. It takes consistent patterns across multiple submissions to build a meaningful signal.
- **The professor decides what to do** — AI Guard provides information and insight. It never makes the final call. If a professor sees that a student has been flagged three times but passed every comprehension check with flying colors, that tells a very different story than a student flagged three times who struggles on every quiz.

The entire system is designed around one principle: **students deserve to actually understand what they submit, and the best way to ensure that is to check in when it matters — not to surveil everyone all the time.**

#### What If the Student Uses LLMs to Answer the Quiz?

A fair question — if a student gets flagged and receives a comprehension check, what stops them from pasting the questions into ChatGPT and copying back the answers?

**Short answer:** we don't try to lock students out of their computer. That's the proctoring approach (Respondus, Proctorio), and it's invasive, brittle, and adversarial — the opposite of what AI Guard stands for. Instead, we make it impractical and, more importantly, observable.

**How we handle it:**

- **Tight time window** — the quiz is 3 questions about work the student supposedly wrote. If they actually understand it, answering should take a minute or two. The extension enforces a short, fair time limit — enough for someone who knows their work, but not enough to comfortably copy each question into an LLM, read the response, and paste it back three times.

- **Paste detection on quiz answers** — the extension monitors paste events directly on the quiz answer fields. If a student pastes text into their answer instead of typing it, that's logged as a signal. A student who genuinely understands their own work doesn't need to paste answers to questions about it. This alone isn't damning — maybe they're just a fast typist who composed in another field — but combined with other signals, it tells a story.

- **Tab-switch and focus detection** — the extension listens for `visibilitychange` and `blur` events on the quiz page. If the student switches to another tab, opens a new window, or leaves the quiz page during those 3 questions, the extension logs it. It doesn't block the behavior — it records it. A student who stays focused and answers quickly looks very different from one who alt-tabs 6 times during a 90-second quiz.

- **All quiz-time behavior feeds into the confidence score** — this is the key insight. We don't treat any single action as proof of cheating. We treat it as another behavioral signal. A student who was flagged, stayed focused on the quiz, typed their answers, and got them right? Their flag weight drops significantly — they clearly understand the material. A student who was flagged, switched tabs 5 times, pasted in their answers, and took 4 minutes on a simple question? That behavior itself adds weight to the flag, even if they eventually got the answers right. The professor sees all of it.

- **The math doesn't work in the student's favor** — even if a student manages to cheat on the quiz within the time limit, the combination of tab-switching + paste events + suspicious timing + whatever heuristics flagged them in the first place builds a pattern that the professor can see clearly on the dashboard. Cheating on the quiz doesn't clear the flag — it just adds more context.

The result: students who actually understand their work breeze through the quiz in 60 seconds, type their answers, their flag drops, and they move on. Students who don't understand their work either struggle honestly (which is valuable feedback for the professor) or exhibit suspicious behavior trying to cheat the quiz (which is equally valuable information). Either way, the professor gets a clearer picture.

#### More Heuristics to Come

Time analysis and quiz-time behavioral monitoring are next. We are actively researching additional behavioral patterns and signals to build a robust, multi-signal detection system where no single heuristic is a verdict, but the combination provides professors with the context they need to support their students.

---

## Business Model

AI Guard follows the standard B2B SaaS model used across education technologies like Turnitin, Respondus, Proctorio, HonorLock, Gradescope and many more. The university pays for it, not the students.

## Roadmap

### Phase 1 — Backend + Frontend + Style Fingerprinting (current)
- Python FastAPI backend with PostgreSQL (Neon) — AI detection, quiz, summary, style fingerprinting, class/student management
- Split React frontends — professor app (class management, analysis, style profiles) + student app (submit, quiz, history)
- LLM-agnostic architecture (OpenAI / Anthropic / Gemini via OpenRouter)
- Cost optimizations: dual-model routing, submission caching, result caching, quiz pool reuse, optional detection skip
- Writing style fingerprinting: ~80 quantitative metrics (prose + code) + LLM qualitative analysis
- Style-aware AI detection: student's writing profile injected into the detection prompt for personalized analysis
- Per-student profiles with Welford's online algorithm (incremental, O(1) updates)
- Confidence score formula combining AI detection + style deviation + quiz adjustment
- Canvas LMS API integration ready (professor token access to submissions + assignment specs)

### Phase 2 — Browser Extension
- Chrome extension with paste detection on Canvas
- Submit button interception + comprehension check overlay
- Communication with backend API
- Time-based analysis: track assignment open → submit timestamps

### Phase 3 — Canvas Integration + Cloud
- Auto-pull assignments and submissions via Canvas REST API
- Bulk historical submission import for building student profiles
- Post AI Guard results back to Canvas as grade comments

### Phase 4 — Cloud + LMS Integration
- Deploy backend to cloud (AWS / GCP)
- LTI 1.3 integration with Canvas, Blackboard, Moodle
- Instructor dashboard with comprehension trends and heuristic flags
- University SSO (SAML 2.0, OAuth 2.0)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Python, FastAPI, async SQLAlchemy |
| Database | PostgreSQL (Neon) with asyncpg |
| AI / Comprehension Engine | OpenAI / Anthropic / Gemini (provider-agnostic via OpenRouter) |
| Frontend (current) | React (Vite) — split professor (port 5174) + student (port 5175) apps |
| Extension (planned) | JavaScript/TypeScript, Chrome Extensions Manifest V3 |
| Auth (planned) | SAML 2.0, OAuth 2.0, JWT |
| Infrastructure (planned) | AWS / GCP, Docker |
| LMS Integration (planned) | LTI 1.3, Canvas REST API, Blackboard REST API |

---



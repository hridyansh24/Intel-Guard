# Intel Guard

**Don't block AI. Make cheating pointless.**

Intel Guard is an academic integrity platform delivered as a lightweight browser extension. It intercepts AI-assisted submissions on learning management systems (Canvas, Blackboard, Moodle) and requires students to demonstrate understanding before submitting — turning passive copy-pasting into active learning.

---

## The Problem

Universities are spending millions trying to catch AI-generated submissions after the fact. Current solutions are still failing

- **AI detectors** (Turnitin, GPTZero) produce false positives, penalizing honest students and creating legal liability for institutions.
- **Honor codes** rely on trust in an era where AI tools exist, instant, and are increasingly undetectable.
- **Exam proctoring** (Respondus, Proctorio, HonorLock) only covers exams — not homework, essays, coding assignments, or lab reports where most AI usage actually happens.

The result: faculty distrust student work, students distrust detection tools, and universities are stuck in an arms race they can't win.

---

## The Solution

Intel Guard takes a fundamentally different approach. Instead of detecting AI after submission, we intervene at the moment of submission and verify comprehension in real time.

### How It Works

1. **Student installs the extension** — mandated by the university, free for students, available on Chrome, Edge, and Firefox.
2. **Extension activates on LMS domains** — it only runs on authorized education platforms (Canvas, Blackboard, Moodle). It does nothing on other websites.
3. **Paste events are detected** — when a student pastes content into an assignment submission field, the extension flags it.
4. **Comprehension check triggers** — before the student can submit, a short, AI-generated quiz appears based on the pasted content. For example:
   - Pasted a Python function? Explain what the base case of the recursion does.
   - Pasted an essay paragraph about the Cold War? Identify the thesis and one supporting argument.
   - Pasted a chemistry formula derivation? Solve a slight variation of the same problem.
   - The teacher could ask custom questions, which the AI will check based on student's response.
5. **Pass = submit.** The student demonstrates understanding and their work goes through normally.
6. **Fail = flag + retry.** The submission is flagged for the instructor's dashboard, and the student can review the material and retry.

7. **This is not to punish students, but to make sure they understand what they submit**
8. **If the faculty decides not to quiz students, they could also have them read through an AI-generated explanation of their submission**

### Key Differentiator

Intel Guard does not ban AI. It does not accuse students of cheating. It simply ensures that anything a student submits — regardless of how it was produced — is something they actually understand. This makes AI-assisted cheating pointless, not prohibited.

---

## Target Audience

**Primary buyer:** University administrators, provost offices, and academic integrity committees looking for scalable, institution-wide solutions that go beyond unreliable AI detection.

**Secondary stakeholders:**

- **Faculty** — get a dashboard showing comprehension trends per assignment, per student, and per course. No more guessing who understands the material.
- **IT departments** — lightweight deployment via managed browser policies (Intune, Jamf, Google Workspace Admin). No custom infrastructure required.
- **Students** — the comprehension checks double as study reinforcement. Students who engage with the quizzes actually learn more.

---

## Technical Architecture

![Intel Guard Flow](IMG_6229.png)

### What's Built Now

- **Python FastAPI backend** running locally with the following endpoints:
  - Upload assignment specs (the "context" that grounds all AI calls)
  - AI detection using a 7-layer heuristic prompt (content, vocabulary, grammar, formatting, chatbot artifacts, "soulless but clean" test, code-specific signals)
  - Comprehension quiz generation + answer evaluation
  - Submission summarization as an alternative to quizzing
  - Combined `/submit` endpoint that orchestrates the full flow in one call
- **LLM-agnostic** — swap between OpenAI, Anthropic, or Gemini by changing one `.env` variable
- **Cost-optimized** — dual-model routing (primary model for detection/generation, mini model for evaluation), submission caching, optional AI detection skip

### Planned (Extension + Cloud)

- **Content Script** — injected on whitelisted LMS domains. Monitors paste events on assignment submission forms and intercepts the submit action.
- **Popup UI** — shows the student their comprehension check status and history.
- **Background Service Worker** — handles communication with the Intel Guard backend, manages auth tokens, and caches quiz state.
- **LMS Gating Token** — the extension injects a verification header/token that the LMS (configured by the university) requires for submission access. No extension = no submission.
- **LMS Integration Layer** — connects via LTI 1.3 and Canvas/Blackboard REST APIs for assignment metadata, course info, and grade passback.
- **Analytics Pipeline** — aggregates anonymized comprehension data for instructor and admin dashboards.
- **Auth Service** — university SSO integration (SAML 2.0, OAuth 2.0) so students log in with existing campus credentials.

---

## Business Model

Intel Guard follows the standard B2B SaaS model used across education technologies like Turnitin, Respondus, Proctorio, HonorLock, Gradescope and many more. The university pays for it, not the students.

## Roadmap

### Phase 1 — Local Backend (current)
- Python FastAPI backend with AI detection, quiz, and summary endpoints
- LLM-agnostic architecture (OpenAI / Anthropic / Gemini)
- Cost optimizations: dual-model routing, submission caching, optional detection skip

### Phase 2 — Browser Extension
- Chrome extension with paste detection on Canvas
- Submit button interception + comprehension check overlay
- Communication with backend API

### Phase 3 — Cloud + LMS Integration
- Deploy backend to cloud (AWS / GCP)
- LTI 1.3 integration with Canvas, Blackboard, Moodle
- Instructor dashboard with comprehension trends
- University SSO (SAML 2.0, OAuth 2.0)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Python, FastAPI |
| AI / Comprehension Engine | OpenAI / Anthropic / Gemini (provider-agnostic) |
| Storage (current) | JSON files on disk |
| Storage (planned) | PostgreSQL + Redis |
| Extension (planned) | JavaScript/TypeScript, Chrome Extensions Manifest V3 |
| Frontend Dashboard (planned) | React, TypeScript, Tailwind CSS |
| Auth (planned) | SAML 2.0, OAuth 2.0, JWT |
| Infrastructure (planned) | AWS / GCP, Docker |
| LMS Integration (planned) | LTI 1.3, Canvas REST API, Blackboard REST API |

---



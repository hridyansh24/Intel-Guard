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

IntegriLearn takes a fundamentally different approach. Instead of detecting AI after submission, we intervene at the moment of submission and verify comprehension in real time.

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
8. **if the faculty decides not to quiz students they could also have them read through an AI generated explaination of thir submission**

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

```
┌─────────────────────────────────────────────────────┐
│                  Student's Browser                   │
│  ┌───────────────────────────────────────────────┐  │
│  │         IntegriLearn Chrome Extension          │  │
│  │                                                │  │
│  │  • Content script injected on LMS domains      │  │
│  │  • Clipboard / paste event listener            │  │
│  │  • Submit button interception                  │  │
│  │  • Comprehension check overlay UI              │  │
│  │  • Auth token injection for LMS gating         │  │
│  └──────────────────┬────────────────────────────┘  │
└─────────────────────┼───────────────────────────────┘
                      │ HTTPS / WebSocket
                      ▼
┌─────────────────────────────────────────────────────┐
│              IntegriLearn Backend (Cloud)             │
│                                                      │
│  ┌──────────────┐  ┌────────────────────────────┐   │
│  │  Auth + SSO   │  │  Comprehension Engine (AI)  │  │
│  │  (SAML/OAuth) │  │                             │  │
│  │               │  │  • Analyzes pasted content   │  │
│  └──────────────┘  │  • Generates quiz questions   │  │
│                     │  • Evaluates responses        │  │
│  ┌──────────────┐  │  • Adapts to subject/level    │  │
│  │ LMS Integration│ └────────────────────────────┘  │
│  │ (Canvas API,  │                                   │
│  │  LTI 1.3)    │  ┌────────────────────────────┐   │
│  └──────────────┘  │  Analytics + Dashboard       │  │
│                     │                              │  │
│  ┌──────────────┐  │  • Per-student comprehension  │  │
│  │  Database     │  │  • Per-course trends          │  │
│  │  (PostgreSQL) │  │  • AI usage patterns          │  │
│  └──────────────┘  │  • Exportable reports          │  │
│                     └────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
``` 
**could also have it stored in a comment or a note for the grader**

### Extension Components

- **Content Script** — injected on whitelisted LMS domains. Monitors paste events on assignment submission forms and intercepts the submit action.
- **Popup UI** — shows the student their comprehension check status and history.
- **Background Service Worker** — handles communication with the Intel Guard backend, manages auth tokens, and caches quiz state.
- **LMS Gating Token** — the extension injects a verification header/token that the LMS (configured by the university) requires for submission access. No extension = no submission.

### Backend Services

- **Comprehension Engine** — AI-powered service that takes pasted content + assignment context and generates targeted comprehension questions. Adapts to subject matter (code, essays, math, science) and difficulty level.
- **LMS Integration Layer** — connects via LTI 1.3 and Canvas/Blackboard REST APIs for assignment metadata, course info, and grade passback.
- **Analytics Pipeline** — aggregates anonymized comprehension data for instructor and admin dashboards.
- **Auth Service** — university SSO integration (SAML 2.0, OAuth 2.0) so students log in with existing campus credentials.

---

## Business Model

IntegriLearn follows the standard B2B SaaS model used across Education technologies like Turnitin, Respondus, Proctorio, HonorLock, Gradescope and many more. The university pays for it not the students.



## Roadmap

### Phase 1 — MVP for now
- Chrome extension with paste detection on Canvas
- Basic comprehension check generation (essay and code)
- Simple instructor notification system
- Manual university onboarding


## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | JavaScript/TypeScript, Chrome Extensions Manifest V3, WebExtensions API |
| Frontend (Dashboard) | React, TypeScript, Tailwind CSS |
| Backend API | Node.js / Python (FastAPI) |
| AI / Comprehension Engine | Claude API / OpenAI API |
| Database | PostgreSQL + Redis (caching) |
| Auth | SAML 2.0, OAuth 2.0, JWT |
| Infrastructure | AWS / GCP, Docker, Kubernetes |
| LMS Integration | LTI 1.3, Canvas REST API, Blackboard REST API |
| Monitoring | Datadog, Sentry |

---



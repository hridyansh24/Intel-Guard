# IntegriLearn

**Don't block AI. Make cheating pointless.**

IntegriLearn is an academic integrity platform delivered as a lightweight browser extension. It intercepts AI-assisted submissions on learning management systems (Canvas, Blackboard, Moodle) and requires students to demonstrate understanding before submitting — turning passive copy-pasting into active learning.

---

## The Problem

Universities are spending millions trying to catch AI-generated submissions after the fact. Current solutions are failing:

- **AI detectors** (Turnitin, GPTZero) produce false positives, penalizing honest students and creating legal liability for institutions.
- **Honor codes** rely on trust in an era where AI tools are free, instant, and increasingly undetectable.
- **Exam proctoring** (Respondus, Proctorio) only covers exams — not homework, essays, coding assignments, or lab reports where most AI usage actually happens.

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
5. **Pass = submit.** The student demonstrates understanding and their work goes through normally.
6. **Fail = flag + retry.** The submission is flagged for the instructor's dashboard, and the student can review the material and retry.

### Key Differentiator

IntegriLearn does not ban AI. It does not accuse students of cheating. It simply ensures that anything a student submits — regardless of how it was produced — is something they actually understand. This makes AI-assisted cheating pointless, not prohibited.

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

### Extension Components

- **Content Script** — injected on whitelisted LMS domains. Monitors paste events on assignment submission forms and intercepts the submit action.
- **Popup UI** — shows the student their comprehension check status and history.
- **Background Service Worker** — handles communication with the IntegriLearn backend, manages auth tokens, and caches quiz state.
- **LMS Gating Token** — the extension injects a verification header/token that the LMS (configured by the university) requires for submission access. No extension = no submission.

### Backend Services

- **Comprehension Engine** — AI-powered service that takes pasted content + assignment context and generates targeted comprehension questions. Adapts to subject matter (code, essays, math, science) and difficulty level.
- **LMS Integration Layer** — connects via LTI 1.3 and Canvas/Blackboard REST APIs for assignment metadata, course info, and grade passback.
- **Analytics Pipeline** — aggregates anonymized comprehension data for instructor and admin dashboards.
- **Auth Service** — university SSO integration (SAML 2.0, OAuth 2.0) so students log in with existing campus credentials.

---

## Business Model

IntegriLearn follows the standard B2B SaaS model used across EdTech (Turnitin, Respondus, Proctorio). The university pays — not the student.

### Pricing Tiers

| Tier | Price | Includes |
|------|-------|----------|
| **Starter** | $5/student/year | Paste detection, basic comprehension checks, submit gating, instructor alerts |
| **Professional** | $10/student/year | Everything in Starter + analytics dashboard, per-course reports, multi-LMS support, priority onboarding |
| **Enterprise** | $15/student/year | Everything in Professional + custom comprehension models, API access, dedicated support, SLA guarantees, curriculum gap analysis |

### Revenue Projections

| Scale | Students | Annual Revenue (Professional) |
|-------|----------|-------------------------------|
| 5 universities | 100,000 | $1,000,000 |
| 20 universities | 500,000 | $5,000,000 |
| 50 universities | 1,500,000 | $15,000,000 |

### Why Universities Will Pay

- **Cheaper than the status quo.** Turnitin licenses cost $3-10/student/year and only detect (unreliably). IntegriLearn prevents and teaches.
- **Reduces academic misconduct cases.** Every formal cheating case costs the university 10-40 hours of faculty and administrative time.
- **Liability protection.** No more false accusations from unreliable AI detectors.
- **Learning outcome data.** The analytics dashboard provides comprehension metrics that universities can use for accreditation reporting.

---

## Competitive Landscape

| Feature | IntegriLearn | Turnitin | Respondus | Proctorio |
|---------|-------------|----------|-----------|-----------|
| AI detection | — | ✓ (unreliable) | — | — |
| Real-time intervention | ✓ | — | — | — |
| Comprehension verification | ✓ | — | — | — |
| Works on homework/essays | ✓ | ✓ | — | — |
| Works on coding assignments | ✓ | — | — | — |
| Instructor analytics | ✓ | Basic | Basic | ✓ |
| Student learning benefit | ✓ | — | — | — |
| No false accusations | ✓ | — | ✓ | ✓ |

---

## Roadmap

### Phase 1 — MVP (Months 1-3)
- Chrome extension with paste detection on Canvas
- Basic comprehension check generation (essay and code)
- Simple instructor notification system
- Manual university onboarding

### Phase 2 — Platform (Months 4-6)
- Instructor analytics dashboard
- Support for Blackboard and Moodle
- Firefox and Edge extension builds
- LTI 1.3 integration for seamless LMS embedding
- University admin portal

### Phase 3 — Scale (Months 7-12)
- Advanced comprehension models (math, science, humanities)
- Curriculum gap analysis for departments
- API for third-party integrations
- Mobile browser support
- SOC 2 Type II compliance

### Phase 4 — Expansion (Year 2+)
- High school / K-12 market
- Corporate training and certification platforms
- International LMS support (region-specific platforms)
- Custom AI model training per institution

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | JavaScript/TypeScript, Chrome Extensions Manifest V3, WebExtensions API |
| Frontend (Dashboard) | React, TypeScript, Tailwind CSS |
| Backend API | Node.js / Python (FastAPI) |
| AI / Comprehension Engine | Claude API (Anthropic) / OpenAI API |
| Database | PostgreSQL + Redis (caching) |
| Auth | SAML 2.0, OAuth 2.0, JWT |
| Infrastructure | AWS / GCP, Docker, Kubernetes |
| LMS Integration | LTI 1.3, Canvas REST API, Blackboard REST API |
| Monitoring | Datadog, Sentry |

---

## Getting Started (Development)

```bash
# Clone the repository
git clone https://github.com/integrilearn/integrilearn.git
cd integrilearn

# Install dependencies
npm install

# Build the extension
npm run build:extension

# Load in Chrome
# 1. Navigate to chrome://extensions
# 2. Enable Developer Mode
# 3. Click "Load unpacked"
# 4. Select the /dist/extension directory

# Start the backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload

# Start the dashboard
cd dashboard
npm run dev
```

---

## Privacy and Compliance

- **FERPA compliant** — student data is encrypted at rest and in transit, access is role-based, and no data is shared with third parties.
- **SOC 2 Type II** — targeted for Phase 3.
- **Data minimization** — the extension only activates on whitelisted LMS domains. No browsing data, keystrokes, or personal information is collected outside of assignment submissions.
- **Transparency** — students can view exactly what data has been collected about them and their comprehension check history at any time.

---

## Team

*Looking for co-founders and early contributors in:*

- Full-stack development (extension + backend)
- AI/ML engineering (comprehension question generation)
- EdTech sales (university partnerships)
- UX/UI design (student-facing quiz experience)

---

## Contact

**Email:** hello@integrilearn.com
**Website:** www.integrilearn.com

---

*IntegriLearn — because understanding matters more than detection.*

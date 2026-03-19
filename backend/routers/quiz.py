from fastapi import APIRouter
from backend.services.context_store import load_context
from backend.services.llm import call_llm
from backend.schemas import QuizResponse, QuizQuestion, EvaluateRequest, EvaluateResponse
import json

router = APIRouter(prefix="/quiz", tags=["quiz"])

QUIZ_GENERATION_PROMPT = """You are a university instructor creating a comprehension check. Your goal is to verify that a student actually understands the work they submitted — not to trick them, but to confirm genuine comprehension.

You will receive:
1. The ASSIGNMENT SPECIFICATION — the original task requirements.
2. The STUDENT SUBMISSION — what the student wrote or coded.

Generate exactly {num_questions} questions that:
- Test understanding of the core concepts in the submission, not surface-level recall
- Are grounded in the assignment context (reference specific requirements)
- For code: ask about logic, design decisions, edge cases, or how to modify it — not "what does line 5 do"
- For essays: ask about the argument structure, evidence choices, or how they'd respond to a counterpoint
- Are answerable in 2-4 sentences each
- A student who wrote the work themselves could answer easily; someone who copy-pasted could not

Respond in EXACTLY this JSON format, no other text:
{{
    "questions": [
        {{"question": "...", "question_number": 1}},
        {{"question": "...", "question_number": 2}}
    ]
}}"""

EVALUATE_PROMPT = """You are evaluating a student's answer to a comprehension check question about their own submission.

You will receive:
1. The ASSIGNMENT SPECIFICATION — original task context.
2. The STUDENT SUBMISSION — what they submitted.
3. The QUESTION — what they were asked.
4. The STUDENT'S ANSWER — their response to the question.

Evaluate whether the answer demonstrates genuine understanding of the submitted work. Be fair but firm:
- Accept informal language, typos, and imperfect phrasing — you're testing understanding, not writing quality
- A correct answer doesn't need to be exhaustive, just show the student knows what they submitted
- Flag vague, evasive, or generic answers that could apply to any submission

Respond in EXACTLY this JSON format, no other text:
{{
    "passed": true/false,
    "score": 0.XX,
    "feedback": "Brief explanation of why the answer passed or failed."
}}

Score 0.0-1.0 where 0.7+ is passing."""


@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(
    context_id: str,
    submission_text: str,
    num_questions: int = 3,
):
    """Generate comprehension check questions based on submission + assignment context."""
    context = load_context(context_id)

    system = QUIZ_GENERATION_PROMPT.format(num_questions=num_questions)
    user_message = (
        f"ASSIGNMENT SPECIFICATION:\n{context['spec_text']}\n\n"
        f"STUDENT SUBMISSION:\n{submission_text}"
    )

    raw = call_llm(system, user_message)

    try:
        result = json.loads(raw)
        questions = [QuizQuestion(**q) for q in result["questions"]]
    except (json.JSONDecodeError, KeyError):
        questions = [QuizQuestion(question=raw, question_number=1)]

    return QuizResponse(context_id=context_id, questions=questions)


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_answer(req: EvaluateRequest):
    """Evaluate a student's answer to a comprehension check question."""
    context = load_context(req.context_id)

    user_message = (
        f"ASSIGNMENT SPECIFICATION:\n{context['spec_text']}\n\n"
        f"STUDENT SUBMISSION:\n{req.submission_text}\n\n"
        f"QUESTION:\n{req.question}\n\n"
        f"STUDENT'S ANSWER:\n{req.student_answer}"
    )

    raw = call_llm(EVALUATE_PROMPT, user_message, use_mini=True)

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {"passed": False, "score": 0.0, "feedback": raw}

    return EvaluateResponse(
        passed=result.get("passed", False),
        score=result.get("score", 0.0),
        feedback=result.get("feedback", raw),
    )

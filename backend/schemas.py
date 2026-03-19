from pydantic import BaseModel
from typing import Optional

class ContextResponse(BaseModel):
    context_id: str
    title: str
    message: str

class AnalyzeResponse(BaseModel):
    context_id: str
    extracted_text: str
    ai_probability: float          # 0.0 - 1.0
    ai_signals_found: list[str]    # specific AI patterns detected
    human_signals_found: list[str] # specific human patterns detected
    ai_assessment: str             # LLM's detailed reasoning
    file_type: str

class QuizQuestion(BaseModel):
    question: str
    question_number: int

class QuizResponse(BaseModel):
    context_id: str
    questions: list[QuizQuestion]

class EvaluateRequest(BaseModel):
    context_id: str
    submission_text: str
    question: str
    student_answer: str

class EvaluateResponse(BaseModel):
    passed: bool
    score: float                   # 0.0 - 1.0
    feedback: str

class SummaryResponse(BaseModel):
    context_id: str
    summary: str

class SubmitResponse(BaseModel):
    context_id: str
    extracted_text: str
    file_type: str
    ai_detection: Optional[dict]   # None if skip_detection=True
    quiz: Optional[dict]           # None if mode="summary"
    summary: Optional[str]         # None if mode="quiz"

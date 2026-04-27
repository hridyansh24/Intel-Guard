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
    options: list[str] = []
    question_number: int

class QuizResponse(BaseModel):
    context_id: str
    questions: list[QuizQuestion]

class EvaluateRequest(BaseModel):
    context_id: str
    submission_text: str
    question: str
    chosen_index: int

class EvaluateResponse(BaseModel):
    passed: bool
    score: float                   # 0.0 - 1.0
    feedback: str
    correct_index: int = -1
    chosen_index: int = -1

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
    style_analysis: Optional[dict] = None      # Style deviation if student_id provided
    confidence_score: Optional[dict] = None    # Combined heuristic confidence score


class StyleUpdateResponse(BaseModel):
    student_id: str
    submission_count: int
    content_type: str
    message: str


class StyleProfileResponse(BaseModel):
    student_id: str
    submission_count: int
    created_at: str
    updated_at: str
    quantitative_scalars: dict
    quantitative_vectors: dict
    qualitative: dict
    submission_history: list


class StyleCompareResponse(BaseModel):
    student_id: str
    style_deviation_score: float
    quantitative_deviation: float
    qualitative_deviation: float
    top_deviations: list
    sufficient_history: bool
    submission_count: int
    confidence_score: Optional[dict] = None
    message: Optional[str] = None

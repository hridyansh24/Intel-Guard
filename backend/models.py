from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, Integer, Float, DateTime, ForeignKey, Table
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from backend.database import Base


def utcnow():
    return datetime.now(timezone.utc)


# ── Association tables ──

class_students = Table(
    "class_students", Base.metadata,
    Column("class_id", String, ForeignKey("classes.id"), primary_key=True),
    Column("student_id", String, ForeignKey("students.id"), primary_key=True),
)


class ClassContext(Base):
    __tablename__ = "class_contexts"
    class_id = Column(String, ForeignKey("classes.id"), primary_key=True)
    context_id = Column(String, ForeignKey("contexts.id"), primary_key=True)
    skip_detection = Column(Boolean, default=False)


# ── Core tables ──

class Student(Base):
    __tablename__ = "students"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    classes = relationship("Class", secondary=class_students, back_populates="students")


class Class(Base):
    __tablename__ = "classes"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    students = relationship("Student", secondary=class_students, back_populates="classes")
    context_links = relationship("ClassContext", cascade="all, delete-orphan")


class Context(Base):
    __tablename__ = "contexts"
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    spec_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class Submission(Base):
    __tablename__ = "submissions"
    id = Column(String, primary_key=True)
    student_id = Column(String, ForeignKey("students.id"))
    student_name = Column(String)
    context_id = Column(String, ForeignKey("contexts.id"))
    context_title = Column(String)
    class_id = Column(String, ForeignKey("classes.id"))
    timestamp = Column(DateTime(timezone=True), default=utcnow)
    ai_detection = Column(JSONB)
    style_analysis = Column(JSONB)
    confidence_score = Column(JSONB)
    quiz_results = Column(JSONB)


class StyleProfile(Base):
    __tablename__ = "style_profiles"
    student_id = Column(String, ForeignKey("students.id"), primary_key=True)
    submission_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    quantitative_scalars = Column(JSONB, default=dict)
    quantitative_vectors = Column(JSONB, default=dict)
    qualitative = Column(JSONB, default=dict)
    style_summary = Column(Text, default="")
    submission_history = Column(JSONB, default=list)


class SubmissionCache(Base):
    __tablename__ = "submission_cache"
    content_hash = Column(String, primary_key=True)
    extracted_text = Column(Text)
    file_type = Column(String)


class ResultCache(Base):
    __tablename__ = "result_cache"
    cache_key = Column(String, primary_key=True)
    context_id = Column(String)
    operation = Column(String)
    result = Column(JSONB)


class QuizPool(Base):
    __tablename__ = "quiz_pools"
    cache_key = Column(String, primary_key=True)
    context_id = Column(String)
    pool = Column(JSONB)
    served_indices = Column(JSONB, default=list)

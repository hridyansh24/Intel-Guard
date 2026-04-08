from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import init_db
from backend.routers import context, analyze, quiz, summary, submit, style, students, classes, submissions


@asynccontextmanager
async def lifespan(app):
    await init_db()
    yield

app = FastAPI(
    title="AI Guard",
    description="Don't block AI. Make cheating pointless.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(context.router)
app.include_router(analyze.router)
app.include_router(quiz.router)
app.include_router(summary.router)
app.include_router(submit.router)
app.include_router(style.router)
app.include_router(students.router)
app.include_router(classes.router)
app.include_router(submissions.router)


@app.get("/")
async def root():
    return {"message": "AI Guard API is running.", "docs": "/docs"}

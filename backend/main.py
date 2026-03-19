from fastapi import FastAPI
from backend.routers import context, analyze, quiz, summary, submit

app = FastAPI(
    title="Intel Guard",
    description="Don't block AI. Make cheating pointless.",
    version="0.1.0",
)

app.include_router(context.router)
app.include_router(analyze.router)
app.include_router(quiz.router)
app.include_router(summary.router)
app.include_router(submit.router)


@app.get("/")
async def root():
    return {"message": "Intel Guard API is running.", "docs": "/docs"}

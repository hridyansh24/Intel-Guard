from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    llm_provider: str = "openai"
    llm_api_key: str
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o"
    llm_model_mini: str = "gpt-4o-mini"
    database_url: str = "postgresql+asyncpg://localhost/ai_guard"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

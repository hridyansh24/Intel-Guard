from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    llm_provider: str = "openai"
    llm_api_key: str
    llm_model: str = "gpt-4o"
    llm_model_mini: str = "gpt-4o-mini"
    context_store_dir: str = "./context_store"
    submission_cache_dir: str = "./submission_cache"

    class Config:
        env_file = ".env"

settings = Settings()

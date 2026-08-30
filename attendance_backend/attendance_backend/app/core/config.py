from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/attendance_db"

    # JWT
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # App
    APP_ENV: str = "development"
    AI_URL: str = "http://127.0.0.1:11434/api/generate"
    AI_MODEL: str = "qwen:0.5b"
    APP_PORT: int = 8000

    # Admin seed
    ADMIN_EMAIL: str = "admin@school.edu"
    ADMIN_PASSWORD: str = "Admin@1234"

    # Super Admin seed
    SUPER_ADMIN_EMAIL: str = "superadmin@iot.com"
    SUPER_ADMIN_PASSWORD: str = "Admin@1234"

    # AI Keys
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""


    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

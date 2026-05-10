"""
Core configuration using Pydantic Settings
"""
from typing import List
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # App
    APP_NAME: str = "IAPost"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ENCRYPTION_KEY: str = ""  # Fernet key for API keys

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/iapost.db"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Cartero Email
    CARTERO_URL: str = "http://192.168.1.2:3001/send"
    CARTERO_KEY: str = ""

    # Scheduler
    SCHEDULER_HOUR: int = 6
    SCHEDULER_MINUTE: int = 30

    # Timezone
    TZ: str = "Europe/Madrid"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

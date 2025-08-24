# backend/app/config.py
import os
from datetime import timedelta

class Settings:
    # ── Security / Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-me")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")

    # ── Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data.db")

    # ── CORS
    CORS_ALLOW_ORIGINS = os.getenv("CORS_ALLOW_ORIGINS", "*").split(",")

    # ── Files
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")

    @property
    def access_token_timedelta(self) -> timedelta:
        return timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)

settings = Settings()

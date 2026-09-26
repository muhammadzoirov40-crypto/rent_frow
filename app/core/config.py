from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "RentFlow"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SQL_ECHO: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://rentflow:rentflow@localhost:5432/rentflow"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://rentflow:rentflow@localhost:5432/rentflow"

    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET_KEY: str = "change-me-to-a-random-secret-min-32-chars"

    def model_post_init(self, __context) -> None:
        if self.JWT_SECRET_KEY == "change-me-to-a-random-secret-min-32-chars":
            import warnings
            warnings.warn(
                "JWT_SECRET_KEY is using the default value! "
                "Set a secure random secret in .env or environment variable.",
                stacklevel=2,
            )

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "RentFlow <no-reply@renthub.qobus.tj>"
    OTP_EXPIRE_MINUTES: int = 10
    JWT_ALGORITHM: str = "HS256"

    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "rentflow"
    S3_REGION: str = "us-east-1"

    GOOGLE_CLIENT_ID: str = ""

    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    CORS_ORIGINS: list[str] = ["*"]

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()

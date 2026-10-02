from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "RentHub"
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
    EMAIL_FROM: str = "RentHub <no-reply@renthub.qobus.tj>"
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

    # --- AI assistant (Google Gemini) -------------------------------------
    # The key is read server-side only and is never exposed to the browser.
    GEMINI_API_KEY: str = ""
    # Picked empirically against this key, newest probe wins: the 2.5 line is
    # retired for new keys (404) and flash-latest / 3.7 sit at 503 "high demand".
    GEMINI_MODEL: str = "gemini-3.6-flash"
    # Comma-separated fallback chain, tried in order. The free tier grants a
    # *separate* daily quota per model (20/day on flash), so a chain multiplies
    # usable requests instead of merely masking one flaky endpoint: once a model
    # answers 404/429 the walker skips it for the rest of the call.
    GEMINI_FALLBACK_MODELS: str = "gemini-3.8-flash,gemini-3.7-flash,gemini-flash-latest,gemini-3.5-flash"
    GEMINI_TIMEOUT_SECONDS: float = 12.0
    # Hard cap on the whole model walk for one Gemini call. Without it a chain
    # of slow/failing models stacks its timeouts and the chat spinner sits for
    # minutes; with it the worst case is one predictable wait for the user.
    AI_REQUEST_BUDGET_SECONDS: float = 15.0
    # After this many whole-chain failures in a row, stop calling Google for a
    # while instead of paying the full budget on every message just to hear the
    # same 429 again. One probe re-opens the circuit after the cooldown.
    AI_FAILURE_COOLDOWN_SECONDS: int = 120
    # Hard caps so a chat cannot loop on tools forever or burn quota.
    AI_MAX_TOOL_STEPS: int = 6
    AI_RATE_LIMIT_PER_MINUTE: int = 20
    AI_MAX_MESSAGE_CHARS: int = 2000
    AI_MAX_HISTORY: int = 30

    CORS_ORIGINS: list[str] = ["*"]

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()

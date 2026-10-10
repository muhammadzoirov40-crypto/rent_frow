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
    # Used for the deep links inside outgoing emails (open request / open chat).
    PUBLIC_BASE_URL: str = "https://renthub.qobus.tj"
    # Turn off to keep tests/offline runs from ever touching an SMTP server.
    EMAIL_ENABLED: bool = True
    # Every wallet starts here (сомони) so the balance flow is usable out of
    # the box. A real deployment would start users at 0 and top up for real.
    WALLET_STARTING_BALANCE: float = 500.0
    # The balance ships switched OFF: the visitor never sees a balance, a
    # rental request never reserves money, and no top-up can be prepared.
    # The whole money layer stays in the code - flip this one switch (and the
    # matching frontend/src/config/features.ts) to bring it back.
    WALLET_ENABLED: bool = True
    # --- DC City / pay.dc.tj (Dushanbe City) top-ups ------------------------
    # The payment link is public anyway - it is what the user is sent to - so
    # the account and articul may live here. The webhook secret is different:
    # it is the only thing that lets a request credit money, so it must come
    # from .env and is empty until DC City registers our callback.
    PAYDC_ENABLED: bool = True
    PAYDC_URL: str = "https://pay.dc.tj/"
    PAYDC_ACCOUNT: str = "9762000220865843"
    PAYDC_ARTICUL: str = "133"
    PAYDC_DESCRIPTION: str = "DANAT.TJ"
    PAYDC_WEBHOOK_SECRET: str = ""
    # Handing yourself money is an admin action. The browser may only *ask*
    # for a payment link; the ledger is credited by the webhook, or - during
    # tests - by this switch, never by the user's own POST.
    WALLET_ALLOW_MANUAL_TOPUP: bool = False
    OTP_EXPIRE_MINUTES: int = 10
    # --- OTP abuse limits -------------------------------------------------
    # A 6-digit code is 900 000 possibilities, so an attacker only needs to be
    # lucky once unless something stops them asking. Two limits, both keyed on
    # the email (the thing the attacker controls) plus one per caller IP:
    #
    #   * sending: how many codes one address may request in the window, and
    #     how many any single IP may request - this is the email-bomb stopper;
    #   * checking: how many *wrong* codes one address may submit before every
    #     outstanding code for it is voided and the window starts over.
    #
    # A correct code resets the checking counter, so a real user who mistypes
    # twice is never locked out of a code they were legitimately sent.
    OTP_SEND_MAX: int = 5
    OTP_SEND_WINDOW_SECONDS: int = 600
    OTP_SEND_IP_MAX: int = 30
    OTP_VERIFY_MAX_WRONG: int = 5
    OTP_VERIFY_WINDOW_SECONDS: int = 900
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
    # One key per Google Cloud project; the free quota is counted per key, so
    # listing several (comma-separated) simply buys several quotas.
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

    # --- Listing location (Nominatim / OpenStreetMap) -----------------------
    # A listing whose owner did not place a pin is shown at its city's centre,
    # with a note saying so.  When they did type a street address we can do
    # better: geocode it once against Nominatim - the same OpenStreetMap data
    # the map already renders, key-free - and write the coordinates back onto
    # the listing, so the pin lands on the real building and the "city centre
    # shown" note disappears by itself.  Best effort only: any failure (offline,
    # rate limit, no result) leaves the city-centre fallback exactly as it was.
    GEOCODE_ENABLED: bool = True
    GEOCODER_URL: str = "https://nominatim.openstreetmap.org/search"
    # Nominatim refuses unidentified clients: the UA must name the app + site.
    GEOCODER_USER_AGENT: str = "RentHub/1.0 (https://renthub.qobus.tj)"
    GEOCODER_TIMEOUT_SECONDS: float = 6.0
    # Their usage policy: never more than one request per second.
    GEOCODER_MIN_INTERVAL_SECONDS: float = 1.0

    CORS_ORIGINS: list[str] = ["*"]

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()

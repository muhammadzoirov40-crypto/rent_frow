import json
import secrets
import smtplib
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import parseaddr
from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.models.otp_code import OtpCode

SMTP_MAX_RETRIES = 3
SMTP_RETRY_DELAY = 2
RESEND_MAX_RETRIES = 3
RESEND_API_URL = "https://api.resend.com/emails"


def _log(message: str) -> None:
    """Print with flush so OTP delivery logs show up in backend.log immediately."""
    print(message, flush=True)


def generate_otp() -> str:
    """A code an attacker cannot predict.

    ``random`` is a Mersenne twister seeded from the clock: anyone who sees a
    handful of codes can recover the state and forecast the next one, which
    would hand them login for free. ``secrets`` reads from the OS CSPRNG.
    """
    return f"{secrets.randbelow(900000) + 100000}"


# ---------------------------------------------------------------- rate limits
class _WindowCounter:
    """Fixed-window attempt counter, kept in this process's memory.

    RentHub runs as one uvicorn process, so memory *is* the shared state. It is
    deliberately not a cache of anything the user owns: the worst a restart does
    is forgive a few failed attempts, and the worst a bug does is ask a real
    user to wait out a window. Both fail towards "ask again later", never
    towards "let the brute force through".
    """

    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def check(self, key: str, max_hits: int, window: int) -> bool:
        """True while this key still has attempts left. Records nothing."""
        now = time.monotonic()
        with self._lock:
            live = [t for t in self._hits.get(key, ()) if now - t < window]
            self._hits[key] = live
            return len(live) < max_hits

    def record(self, key: str, window: int) -> None:
        now = time.monotonic()
        with self._lock:
            live = [t for t in self._hits.get(key, ()) if now - t < window]
            live.append(now)
            self._hits[key] = live

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()


# The send and the verify counters answer different questions - "may this
# address ask again" and "is this address guessing" - so they never share a
# bucket: a burst of sends must not hide a burst of wrong codes.
_send_counter = _WindowCounter()
_verify_counter = _WindowCounter()


def reset_rate_limits() -> None:
    """Used by the tests, which would otherwise inherit each other's windows."""
    _send_counter.clear()
    _verify_counter.clear()


def allow_send(email: str, ip: str | None) -> tuple[bool, int]:
    """(allowed, retry_after_seconds) for one more code to this address."""
    settings = get_settings()
    for key, limit in (
        (f"send:email:{email.strip().lower()}", settings.OTP_SEND_MAX),
        (f"send:ip:{ip or 'unknown'}", settings.OTP_SEND_IP_MAX),
    ):
        if not _send_counter.check(key, limit, settings.OTP_SEND_WINDOW_SECONDS):
            return False, settings.OTP_SEND_WINDOW_SECONDS
    return True, 0


def record_send(email: str, ip: str | None) -> None:
    settings = get_settings()
    window = settings.OTP_SEND_WINDOW_SECONDS
    _send_counter.record(f"send:email:{email.strip().lower()}", window)
    if ip:
        _send_counter.record(f"send:ip:{ip}", window)


async def save_otp(db: AsyncSession, email: str, code: str) -> None:
    settings = get_settings()
    expire_time = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    await db.execute(
        update(OtpCode).where(OtpCode.email == email, OtpCode.used == False).values(used=True)
    )
    otp = OtpCode(email=email, code=code, expires_at=expire_time, used=False)
    db.add(otp)
    await db.flush()


async def verify_otp(db: AsyncSession, email: str, code: str) -> bool:
    """Consume a code the caller was actually sent - and nothing else.

    Three things a login check has to get right:

    * **no brute force.** A 6-digit code is guessable in bulk, so a wrong guess
      is counted and, past ``OTP_VERIFY_MAX_WRONG``, every outstanding code for
      that address is burned and the caller is told to slow down (429). One
      right guess clears the counter, so nobody is punished for a typo.
    * **no timing leak.** The code comes back from the database by email, then
      is compared with ``secrets.compare_digest`` rather than in SQL, so the
      response time does not narrow the search.
    * **no replay.** The row is marked used in the same transaction that
      consumed it.
    """
    settings = get_settings()
    key = f"verify:{email.strip().lower()}"
    window = settings.OTP_VERIFY_WINDOW_SECONDS
    if not _verify_counter.check(key, settings.OTP_VERIFY_MAX_WRONG, window):
        raise HTTPException(status_code=429, detail="TOO_MANY_OTP_ATTEMPTS")

    now = datetime.utcnow()
    result = await db.execute(
        select(OtpCode).where(
            OtpCode.email == email,
            OtpCode.used == False,
            OtpCode.expires_at > now,
        )
    )
    otp = None
    for candidate in result.scalars():
        if secrets.compare_digest(str(candidate.code), str(code)):
            otp = candidate
            break

    if otp is None:
        _verify_counter.record(key, window)
        if not _verify_counter.check(key, settings.OTP_VERIFY_MAX_WRONG, window):
            # Out of guesses: the code the attacker was aiming at dies with the
            # attempt, so the window that just closed cannot be replayed.
            await db.execute(
                update(OtpCode)
                .where(OtpCode.email == email, OtpCode.used == False)
                .values(used=True)
            )
            await db.flush()
            raise HTTPException(status_code=429, detail="TOO_MANY_OTP_ATTEMPTS")
        return False

    _verify_counter.reset(key)
    otp.used = True
    await db.flush()
    return True


def _otp_subject(code: str) -> str:
    return f"RentHub - Your verification code: {code}"


def _text_body(code: str) -> str:
    settings = get_settings()
    return (
        "Hello!\n\n"
        f"Your RentHub verification code: {code}\n\n"
        f"This code expires in {settings.OTP_EXPIRE_MINUTES} minutes.\n"
        "If you didn't request this, just ignore this email.\n"
    )


def _html_body(code: str) -> str:
    settings = get_settings()
    return f"""
    <html>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #f8fafc; padding: 40px;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: 48px; height: 48px; background: #FF6B35; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <span style="color: white; font-weight: bold; font-size: 22px;">R</span>
          </div>
          <h1 style="font-size: 22px; font-weight: 800; color: #111827; margin: 0;">RentHub</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Equipment & Tool Rental</p>
        </div>

        <p style="color: #374151; font-size: 15px;">Hello! To complete your registration, enter this code:</p>

        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background: #fff4ed; border: 2px solid #ffc8a8; border-radius: 12px; padding: 18px 40px;">
            <span style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #FF6B35; font-family: monospace;">{code}</span>
          </div>
        </div>

        <p style="color: #6b7280; font-size: 13px; text-align: center;">
          This code expires in <strong>{settings.OTP_EXPIRE_MINUTES} minutes</strong>.<br>
          If you didn't request this, just ignore this email.
        </p>
      </div>
    </body>
    </html>
    """


def _build_otp_email(email: str, code: str) -> MIMEMultipart:
    settings = get_settings()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = Header(_otp_subject(code), "utf-8")
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USERNAME
    msg["To"] = email
    msg.attach(MIMEText(_text_body(code), "plain", "utf-8"))
    msg.attach(MIMEText(_html_body(code), "html", "utf-8"))
    return msg


def _smtp_send(msg: MIMEMultipart) -> bool:
    settings = get_settings()
    server = None
    try:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        _, envelope_from = parseaddr(msg["From"] or settings.SMTP_USERNAME)
        server.sendmail(envelope_from, [msg["To"]], msg.as_string())
        return True
    finally:
        if server:
            try:
                server.quit()
            except Exception:
                pass


def _resend_send(email: str, code: str) -> bool:
    settings = get_settings()
    payload = json.dumps(
        {
            "from": settings.EMAIL_FROM,
            "to": [email],
            "subject": _otp_subject(code),
            "text": _text_body(code),
            "html": _html_body(code),
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        RESEND_API_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        if resp.status < 200 or resp.status >= 300:
            raise RuntimeError(f"Resend API returned HTTP {resp.status}")
    return True


def _print_code(email: str, code: str) -> None:
    print(f"\n{'='*40}", flush=True)
    print(f"  OTP CODE for {email}: {code}", flush=True)
    print(f"{'='*40}\n", flush=True)


def send_otp_email(email: str, code: str) -> bool:
    settings = get_settings()

    if settings.RESEND_API_KEY:
        for attempt in range(1, RESEND_MAX_RETRIES + 1):
            try:
                _resend_send(email, code)
                _log(f"[OTP EMAIL] Sent via Resend to {email} (attempt {attempt})")
                return True
            except Exception as e:
                _log(f"[OTP EMAIL] Resend attempt {attempt}/{RESEND_MAX_RETRIES} failed: {e}")
                if attempt < RESEND_MAX_RETRIES:
                    time.sleep(SMTP_RETRY_DELAY)
        _log(f"[OTP EMAIL] Resend failed for {email}, falling back to SMTP")

    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        _print_code(email, code)
        return False

    msg = _build_otp_email(email, code)

    for attempt in range(1, SMTP_MAX_RETRIES + 1):
        try:
            if _smtp_send(msg):
                _log(f"[OTP EMAIL] Sent to {email} (attempt {attempt})")
                return True
        except Exception as e:
            _log(f"[OTP EMAIL] Attempt {attempt}/{SMTP_MAX_RETRIES} failed: {e}")
            if attempt < SMTP_MAX_RETRIES:
                time.sleep(SMTP_RETRY_DELAY)

    _log(f"[OTP EMAIL] All {SMTP_MAX_RETRIES} attempts failed for {email}")
    _print_code(email, code)
    return False

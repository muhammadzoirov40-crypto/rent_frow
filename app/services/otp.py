import random
import smtplib
import time
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.models.otp_code import OtpCode

SMTP_MAX_RETRIES = 3
SMTP_RETRY_DELAY = 2


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


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
    now = datetime.utcnow()
    result = await db.execute(
        select(OtpCode).where(
            OtpCode.email == email,
            OtpCode.code == code,
            OtpCode.used == False,
            OtpCode.expires_at > now,
        )
    )
    otp = result.scalar_one_or_none()
    if otp:
        otp.used = True
        await db.flush()
        return True
    return False


def _build_otp_email(email: str, code: str) -> MIMEMultipart:
    settings = get_settings()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"RentFlow — Your verification code: {code}"
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USERNAME
    msg["To"] = email

    html_body = f"""
    <html>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #f8fafc; padding: 40px;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: 48px; height: 48px; background: #1285ff; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <span style="color: white; font-weight: bold; font-size: 22px;">R</span>
          </div>
          <h1 style="font-size: 22px; font-weight: 800; color: #111827; margin: 0;">RentFlow</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Equipment & Tool Rental</p>
        </div>

        <p style="color: #374151; font-size: 15px;">Hello! To complete your registration, enter this code:</p>

        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background: #f0f9ff; border: 2px solid #bae6fd; border-radius: 12px; padding: 18px 40px;">
            <span style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #1285ff; font-family: monospace;">{code}</span>
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

    msg.attach(MIMEText(html_body, "html"))
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
        server.sendmail(msg["From"], [msg["To"]], msg.as_string())
        return True
    finally:
        if server:
            try:
                server.quit()
            except Exception:
                pass


def send_otp_email(email: str, code: str) -> bool:
    settings = get_settings()
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        print(f"\n{'='*40}")
        print(f"  OTP CODE for {email}: {code}")
        print(f"{'='*40}\n")
        return False

    msg = _build_otp_email(email, code)

    for attempt in range(1, SMTP_MAX_RETRIES + 1):
        try:
            if _smtp_send(msg):
                print(f"[OTP EMAIL] Sent to {email} (attempt {attempt})")
                return True
        except Exception as e:
            print(f"[OTP EMAIL] Attempt {attempt}/{SMTP_MAX_RETRIES} failed: {e}")
            if attempt < SMTP_MAX_RETRIES:
                time.sleep(SMTP_RETRY_DELAY)

    print(f"[OTP EMAIL] All {SMTP_MAX_RETRIES} attempts failed for {email}")
    print(f"\n{'='*40}")
    print(f"  OTP CODE for {email}: {code}")
    print(f"{'='*40}\n")
    return False

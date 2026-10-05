from fastapi import APIRouter, Depends, Request, UploadFile, File
from fastapi import HTTPException, status as http_status
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_auth, CurrentUser
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, SendOtpRequest, VerifyOtpRequest, GoogleAuthRequest
from app.schemas.user import UserResponse, UpdateProfileRequest
from app.schemas.base import APIResponse
from app.services.auth import AuthService
from app.services.otp import (
    allow_send,
    generate_otp,
    record_send,
    save_otp,
    send_otp_email,
    verify_otp,
)
from app.repositories.user import UserRepository

router = APIRouter(prefix="/auth", tags=["Auth"])

ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/jpg", "image/png"}
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5MB


def caller_ip(request: Request) -> str:
    """The address the rate limiter counts against.

    nginx terminates TLS and passes the real client in ``X-Forwarded-For``;
    ``request.client`` would otherwise be 127.0.0.1 for everybody, which makes
    the per-IP limit one shared bucket for the whole internet. The header is
    only trusted because the only thing behind it is our own proxy - the
    backend port is not published.
    """
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/send-otp", response_model=APIResponse[dict])
async def send_otp(data: SendOtpRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Send OTP to email for login or registration."""
    settings = get_settings()
    ip = caller_ip(request)

    allowed, retry_after = allow_send(data.email, ip)
    if not allowed:
        raise HTTPException(
            status_code=http_status.HTTP_429_TOO_MANY_REQUESTS,
            detail="TOO_MANY_OTP_REQUESTS",
            headers={"Retry-After": str(retry_after)},
        )

    repo = UserRepository(db)
    existing = await repo.get_by_email(data.email)
    code = generate_otp()
    await save_otp(db, data.email, code)
    record_send(data.email, ip)
    sent_via_email = await asyncio.to_thread(send_otp_email, data.email, code)
    dev_code = code if settings.DEBUG else None
    if not sent_via_email and dev_code is None:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send OTP email. Please try again later.",
        )
    response_data = {
        "email": data.email,
        "sent_via_email": sent_via_email,
        "is_registered": existing is not None,
        "dev_code": dev_code,
    }
    return APIResponse(
        message="OTP sent successfully",
        data=response_data
    )


@router.post("/verify-otp", response_model=APIResponse[dict])
async def verify_otp_code(data: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    """Verify OTP code (optional pre-check)."""
    if not await verify_otp(db, data.email, data.code):
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code.",
        )
    return APIResponse(message="OTP verified", data={"valid": True})


@router.post("/register", response_model=APIResponse[TokenResponse])
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register with email + OTP code (no password needed)."""
    service = AuthService(db)
    result = await service.register(data)
    return APIResponse(message="Registration successful", data=result)


@router.post("/login", response_model=APIResponse[TokenResponse])
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email + OTP code (no password needed)."""
    service = AuthService(db)
    result = await service.login(data)
    return APIResponse(message="Login successful", data=result)


@router.post("/google", response_model=APIResponse[TokenResponse])
async def google_auth(data: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    """Login or register with Google OAuth token."""
    service = AuthService(db)
    result = await service.google_auth(data)
    return APIResponse(message="Google auth successful", data=result)


@router.get("/me", response_model=APIResponse[UserResponse])
async def get_me(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    user = await service.get_me(current_user.user_id)
    return APIResponse(data=user)


@router.patch("/profile", response_model=APIResponse[UserResponse])
async def update_profile(
    data: UpdateProfileRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    result = await service.update_profile(current_user.user_id, data.display_name)
    return APIResponse(message="Profile updated successfully", data=result)


@router.post("/avatar", response_model=APIResponse[UserResponse])
async def update_avatar(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: JPG, JPEG, PNG. Got: {file.content_type}",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_AVATAR_SIZE:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_AVATAR_SIZE // (1024 * 1024)}MB.",
        )

    service = AuthService(db)
    result = await service.update_avatar(
        user_id=current_user.user_id,
        file_bytes=file_bytes,
        filename=file.filename or "avatar.jpg",
        content_type=file.content_type,
    )
    return APIResponse(message="Avatar updated successfully", data=result)

import uuid
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt
from app.core.config import get_settings
from app.core.enums import UserRole
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserBrief
from app.schemas.user import UserResponse
from app.services.otp import verify_otp
from app.utils.s3 import upload_file, get_presigned_url, delete_file

settings = get_settings()


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    def _create_token(self, user_id: str, role: str) -> str:
        expire = datetime.utcnow() + timedelta(hours=24)
        payload = {
            "sub": user_id,
            "role": role,
            "exp": expire,
        }
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    async def register(self, data: RegisterRequest) -> TokenResponse:
        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered. Please sign in instead.",
            )

        if not await verify_otp(self.db, data.email, data.otp_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code. Please request a new one.",
            )

        external_id = str(uuid.uuid4())
        user = await self.user_repo.create(
            email=data.email,
            hashed_password="",
            external_user_id=external_id,
            role=data.role,
        )

        token = self._create_token(external_id, user.role.value)

        return TokenResponse(
            access_token=token,
            user=UserBrief(id=user.id, email=user.email, role=user.role),
        )

    async def login(self, data: LoginRequest) -> TokenResponse:
        user = await self.user_repo.get_by_email(data.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email not found. Please register first.",
            )

        if not await verify_otp(self.db, data.email, data.otp_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code. Please request a new one.",
            )

        token = self._create_token(user.external_user_id, user.role.value)

        return TokenResponse(
            access_token=token,
            user=UserBrief(id=user.id, email=user.email, role=user.role),
        )

    async def get_me(self, user_id: int) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    async def update_profile(self, user_id: int, display_name: str) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user = await self.user_repo.update(user, display_name=display_name)

        avatar_url = None
        if user.avatar_url:
            try:
                avatar_url = get_presigned_url(user.avatar_url, expires_in=86400)
            except Exception:
                avatar_url = user.avatar_url

        return UserResponse(
            id=user.id,
            email=user.email,
            external_user_id=user.external_user_id,
            role=user.role,
            display_name=user.display_name,
            avatar_url=avatar_url,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    async def update_avatar(self, user_id: int, file_bytes: bytes, filename: str, content_type: str) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.avatar_url:
            try:
                delete_file(user.avatar_url)
            except Exception:
                pass

        avatar_key = upload_file(
            file_bytes=file_bytes,
            folder="avatars",
            filename=filename,
            content_type=content_type,
        )

        user = await self.user_repo.update(user, avatar_url=avatar_key)

        try:
            avatar_url = get_presigned_url(avatar_key, expires_in=86400)
        except Exception:
            avatar_url = avatar_key

        return UserResponse(
            id=user.id,
            email=user.email,
            external_user_id=user.external_user_id,
            role=user.role,
            display_name=user.display_name,
            avatar_url=avatar_url,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

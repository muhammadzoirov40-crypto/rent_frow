from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.enums import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


class CurrentUser:
    def __init__(self, user_id: int, role: UserRole, external_user_id: str):
        self.user_id = user_id
        self.role = role
        self.external_user_id = external_user_id

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    @property
    def is_owner(self) -> bool:
        return self.role == UserRole.OWNER

    @property
    def is_customer(self) -> bool:
        return self.role == UserRole.CUSTOMER


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser | None:
    if token is None:
        return None

    from app.models.user import User

    try:
        from jose import jwt, JWTError
        from app.core.config import get_settings

        settings = get_settings()
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        external_user_id: str = payload.get("sub")
        if external_user_id is None:
            return None
    except JWTError:
        return None

    result = await db.execute(
        select(User).where(User.external_user_id == external_user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        return None

    return CurrentUser(
        user_id=user.id,
        role=user.role,
        external_user_id=user.external_user_id,
    )


async def require_auth(
    current_user: CurrentUser | None = Depends(get_current_user),
) -> CurrentUser:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


async def require_admin(current_user: CurrentUser = Depends(require_auth)) -> CurrentUser:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def require_customer(current_user: CurrentUser = Depends(require_auth)) -> CurrentUser:
    if not current_user.is_customer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer access required",
        )
    return current_user


async def require_owner(current_user: CurrentUser = Depends(require_auth)) -> CurrentUser:
    if not (current_user.is_admin or current_user.is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner access required",
        )
    return current_user

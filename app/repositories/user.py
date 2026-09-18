from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.core.enums import UserRole
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_external_id(self, external_user_id: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.external_user_id == external_user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_role(self, role: UserRole) -> list[User]:
        result = await self.db.execute(
            select(User).where(User.role == role)
        )
        return list(result.scalars().all())

    async def count_by_role(self, role: UserRole) -> int:
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count()).select_from(User).where(User.role == role)
        )
        return result.scalar_one()

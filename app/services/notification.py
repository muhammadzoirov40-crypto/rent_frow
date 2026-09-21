from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.notification import NotificationRepository


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = NotificationRepository(db)

    async def create(
        self,
        user_id: int,
        title: str,
        message: str,
        type: str,
        reference_id: Optional[int] = None,
        reference_type: Optional[str] = None,
    ):
        return await self.repo.create(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            reference_id=reference_id,
            reference_type=reference_type,
        )

    async def get_user_notifications(self, user_id: int, skip: int = 0, limit: int = 20):
        return await self.repo.get_user_notifications(user_id, skip, limit)

    async def get_unread_count(self, user_id: int) -> int:
        return await self.repo.get_unread_count(user_id)

    async def mark_read(self, notification_id: int, user_id: int) -> None:
        await self.repo.mark_as_read(notification_id, user_id)

    async def mark_all_read(self, user_id: int) -> None:
        await self.repo.mark_all_as_read(user_id)

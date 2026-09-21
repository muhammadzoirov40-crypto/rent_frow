from sqlalchemy import select, func, update, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    def __init__(self, db: AsyncSession):
        super().__init__(Notification, db)

    async def get_user_notifications(
        self, user_id: int, skip: int = 0, limit: int = 20
    ) -> list[Notification]:
        result = await self.db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_unread_count(self, user_id: int) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
        )
        return result.scalar_one()

    async def mark_as_read(self, notification_id: int, user_id: int) -> None:
        from sqlalchemy import update as sa_update

        await self.db.execute(
            sa_update(Notification)
            .where(Notification.id == notification_id, Notification.user_id == user_id)
            .values(is_read=True)
        )
        await self.db.flush()

    async def mark_all_as_read(self, user_id: int) -> None:
        from sqlalchemy import update as sa_update

        await self.db.execute(
            sa_update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True)
        )
        await self.db.flush()

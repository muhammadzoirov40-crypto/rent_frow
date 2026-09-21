from sqlalchemy import select, func, update, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.message import Message
from app.repositories.base import BaseRepository


class MessageRepository(BaseRepository[Message]):
    def __init__(self, db: AsyncSession):
        super().__init__(Message, db)

    async def get_conversation_messages(
        self, conversation_id: int, skip: int = 0, limit: int = 50
    ) -> list[Message]:
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_unread_count(self, conversation_id: int, user_id: int) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,
                Message.is_read == False,
            )
        )
        return result.scalar_one()

    async def get_total_unread_count(self, user_id: int) -> int:
        from app.models.conversation import Conversation

        result = await self.db.execute(
            select(func.count())
            .select_from(Message)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                or_(
                    Conversation.user1_id == user_id,
                    Conversation.user2_id == user_id,
                ),
                Message.sender_id != user_id,
                Message.is_read == False,
            )
        )
        return result.scalar_one()

    async def mark_conversation_read(self, conversation_id: int, user_id: int) -> None:
        await self.db.execute(
            update(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,
                Message.is_read == False,
            )
            .values(is_read=True)
        )
        await self.db.flush()

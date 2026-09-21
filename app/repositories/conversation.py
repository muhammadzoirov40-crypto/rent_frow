from typing import Optional
from datetime import datetime
from sqlalchemy import select, func, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.conversation import Conversation
from app.models.message import Message
from app.repositories.base import BaseRepository


class ConversationRepository(BaseRepository[Conversation]):
    def __init__(self, db: AsyncSession):
        super().__init__(Conversation, db)

    async def get_or_create(
        self, user1_id: int, user2_id: int, listing_id: Optional[int] = None
    ) -> Conversation:
        a_id, b_id = min(user1_id, user2_id), max(user1_id, user2_id)
        result = await self.db.execute(
            select(Conversation).where(
                Conversation.user1_id == a_id,
                Conversation.user2_id == b_id,
                Conversation.listing_id == listing_id,
            )
        )
        conv = result.scalar_one_or_none()
        if conv:
            return conv

        conv = Conversation(
            user1_id=a_id,
            user2_id=b_id,
            listing_id=listing_id,
        )
        self.db.add(conv)
        await self.db.flush()
        await self.db.refresh(conv)
        return conv

    async def get_user_conversations(self, user_id: int) -> list[Conversation]:
        result = await self.db.execute(
            select(Conversation)
            .where(or_(Conversation.user1_id == user_id, Conversation.user2_id == user_id))
            .order_by(Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_between_users(
        self, user1_id: int, user2_id: int, listing_id: Optional[int] = None
    ) -> Optional[Conversation]:
        a_id, b_id = min(user1_id, user2_id), max(user1_id, user2_id)
        result = await self.db.execute(
            select(Conversation).where(
                Conversation.user1_id == a_id,
                Conversation.user2_id == b_id,
                Conversation.listing_id == listing_id,
            )
        )
        return result.scalar_one_or_none()

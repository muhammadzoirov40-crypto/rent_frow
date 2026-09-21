from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.message import Message
from app.repositories.message import MessageRepository
from app.repositories.conversation import ConversationRepository


class MessageService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = MessageRepository(db)
        self.conv_repo = ConversationRepository(db)

    async def send(self, conversation_id: int, sender_id: int, content: str) -> Message:
        conv = await self.conv_repo.get_by_id(conversation_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if sender_id not in (conv.user1_id, conv.user2_id):
            raise HTTPException(status_code=403, detail="Not a participant in this conversation")

        message = await self.repo.create(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content,
        )

        conv.last_message_at = datetime.utcnow()
        await self.db.flush()

        return message

    async def get_messages(self, conversation_id: int, skip: int = 0, limit: int = 50) -> list[Message]:
        return await self.repo.get_conversation_messages(conversation_id, skip, limit)

    async def mark_read(self, conversation_id: int, user_id: int) -> None:
        await self.repo.mark_conversation_read(conversation_id, user_id)

    async def get_unread_count(self, conversation_id: int, user_id: int) -> int:
        return await self.repo.get_unread_count(conversation_id, user_id)

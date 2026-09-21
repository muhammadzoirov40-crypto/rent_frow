from typing import Optional
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.conversation import ConversationRepository


class ConversationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ConversationRepository(db)

    async def get_or_create(self, user1_id: int, user2_id: int, listing_id: Optional[int] = None):
        if user1_id == user2_id:
            raise HTTPException(status_code=400, detail="Cannot create conversation with yourself")
        return await self.repo.get_or_create(user1_id, user2_id, listing_id)

    async def get_user_conversations(self, user_id: int):
        return await self.repo.get_user_conversations(user_id)

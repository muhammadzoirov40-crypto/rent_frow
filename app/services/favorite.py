from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.favorite import Favorite
from app.repositories.favorite import FavoriteRepository


class FavoriteService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = FavoriteRepository(db)

    async def toggle(self, user_id: int, listing_id: int) -> bool:
        existing = await self.repo.get_by_user_and_listing(user_id, listing_id)
        if existing:
            await self.repo.delete(existing)
            return False
        else:
            await self.repo.create(user_id=user_id, listing_id=listing_id)
            return True

    async def get_user_favorites(self, user_id: int, skip: int = 0, limit: int = 20) -> tuple[list[Favorite], int]:
        favorites = await self.repo.get_user_favorites(user_id, skip, limit)
        total = await self.repo.count_user_favorites(user_id)
        return favorites, total

    async def is_favorited(self, user_id: int, listing_id: int) -> bool:
        return await self.repo.is_favorited(user_id, listing_id)

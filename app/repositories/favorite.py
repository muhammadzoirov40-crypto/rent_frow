from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.favorite import Favorite
from app.repositories.base import BaseRepository


class FavoriteRepository(BaseRepository[Favorite]):
    def __init__(self, db: AsyncSession):
        super().__init__(Favorite, db)

    async def get_by_user_and_listing(self, user_id: int, listing_id: int) -> Optional[Favorite]:
        result = await self.db.execute(
            select(Favorite).where(
                Favorite.user_id == user_id,
                Favorite.listing_id == listing_id,
            )
        )
        return result.scalar_one_or_none()

    async def is_favorited(self, user_id: int, listing_id: int) -> bool:
        fav = await self.get_by_user_and_listing(user_id, listing_id)
        return fav is not None

    async def get_user_favorites(self, user_id: int, skip: int = 0, limit: int = 20) -> list[Favorite]:
        result = await self.db.execute(
            select(Favorite)
            .where(Favorite.user_id == user_id)
            .order_by(Favorite.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_user_favorites(self, user_id: int) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Favorite).where(Favorite.user_id == user_id)
        )
        return result.scalar_one()

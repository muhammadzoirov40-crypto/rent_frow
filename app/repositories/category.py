from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.category import Category
from app.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    def __init__(self, db: AsyncSession):
        super().__init__(Category, db)

    async def get_by_name(self, name: str) -> Optional[Category]:
        result = await self.db.execute(
            select(Category).where(Category.name == name)
        )
        return result.scalar_one_or_none()

    async def get_all_active(self) -> list[Category]:
        result = await self.db.execute(
            select(Category).where(Category.is_active == True).order_by(Category.sort_order)
        )
        return list(result.scalars().all())

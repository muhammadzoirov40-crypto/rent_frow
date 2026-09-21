from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.city import City
from app.models.district import District
from app.repositories.base import BaseRepository


class CityRepository(BaseRepository[City]):
    def __init__(self, db: AsyncSession):
        super().__init__(City, db)

    async def get_all_active(self) -> list[City]:
        result = await self.db.execute(
            select(City).where(City.is_active == True).order_by(City.name)
        )
        return list(result.scalars().all())

    async def get_by_name(self, name: str) -> Optional[City]:
        result = await self.db.execute(
            select(City).where(City.name == name)
        )
        return result.scalar_one_or_none()

    async def get_districts(self, city_id: int) -> list[District]:
        result = await self.db.execute(
            select(District).where(District.city_id == city_id).order_by(District.name)
        )
        return list(result.scalars().all())

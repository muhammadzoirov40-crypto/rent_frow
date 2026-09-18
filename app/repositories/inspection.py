from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.inspection import Inspection
from app.repositories.base import BaseRepository


class InspectionRepository(BaseRepository[Inspection]):
    def __init__(self, db: AsyncSession):
        super().__init__(Inspection, db)

    async def get_by_rental_id(self, rental_id: int) -> Optional[Inspection]:
        result = await self.db.execute(
            select(Inspection).where(Inspection.rental_id == rental_id)
        )
        return result.scalar_one_or_none()

    async def get_by_equipment_id(self, equipment_id: int) -> list[Inspection]:
        result = await self.db.execute(
            select(Inspection)
            .where(Inspection.equipment_id == equipment_id)
            .order_by(Inspection.created_at.desc())
        )
        return list(result.scalars().all())

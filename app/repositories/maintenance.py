from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.maintenance import Maintenance
from app.core.enums import MaintenanceStatus
from app.repositories.base import BaseRepository


class MaintenanceRepository(BaseRepository[Maintenance]):
    def __init__(self, db: AsyncSession):
        super().__init__(Maintenance, db)

    async def get_by_equipment_id(self, equipment_id: int) -> list[Maintenance]:
        result = await self.db.execute(
            select(Maintenance)
            .where(Maintenance.equipment_id == equipment_id)
            .order_by(Maintenance.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_active_for_equipment(self, equipment_id: int) -> Optional[Maintenance]:
        result = await self.db.execute(
            select(Maintenance).where(
                Maintenance.equipment_id == equipment_id,
                Maintenance.status.in_([MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS]),
            )
        )
        return result.scalar_one_or_none()

    async def get_all_maintenance(
        self, status: Optional[MaintenanceStatus] = None, skip: int = 0, limit: int = 20
    ) -> list[Maintenance]:
        query = select(Maintenance)
        if status:
            query = query.where(Maintenance.status == status)
        query = query.order_by(Maintenance.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

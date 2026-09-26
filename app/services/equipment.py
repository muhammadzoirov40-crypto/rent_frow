from typing import Optional
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.equipment import EquipmentRepository
from app.schemas.equipment import EquipmentCreate, EquipmentUpdate, AvailabilityCheck
from app.models.equipment import Equipment
from app.core.enums import EquipmentStatus


class EquipmentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = EquipmentRepository(db)

    async def create(self, data: EquipmentCreate) -> Equipment:
        existing = await self.repo.get_by_serial_number(data.serial_number)
        if existing:
            raise HTTPException(status_code=409, detail="Equipment with this serial number already exists")
        return await self.repo.create(**data.model_dump())

    async def get_by_id(self, equipment_id: int) -> Equipment:
        equipment = await self.repo.get_by_id(equipment_id)
        if not equipment:
            raise HTTPException(status_code=404, detail="Equipment not found")
        return equipment

    async def update(self, equipment_id: int, data: EquipmentUpdate) -> Equipment:
        equipment = await self.get_by_id(equipment_id)
        update_data = data.model_dump(exclude_unset=True)
        if "serial_number" in update_data:
            existing = await self.repo.get_by_serial_number(update_data["serial_number"])
            if existing and existing.id != equipment_id:
                raise HTTPException(status_code=409, detail="Serial number already exists")
        return await self.repo.update(equipment, **update_data)

    async def delete(self, equipment_id: int) -> None:
        equipment = await self.get_by_id(equipment_id)
        await self.repo.delete(equipment)

    async def search(
        self,
        query: Optional[str] = None,
        category_id: Optional[int] = None,
        status: Optional[EquipmentStatus] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Equipment], int]:
        items = await self.repo.search(query, category_id, status, is_active, skip, limit)
        total = await self.repo.count_filtered(query, category_id, status, is_active)
        return items, total

    async def check_availability(self, data: AvailabilityCheck) -> dict:
        equipment = await self.get_by_id(data.equipment_id)
        conflicting = await self.repo.check_availability(
            data.equipment_id, data.start_date, data.end_date
        )
        available = equipment.status == EquipmentStatus.AVAILABLE and conflicting is None
        return {
            "equipment_id": data.equipment_id,
            "available": available,
            "conflicting_booking_id": conflicting,
        }

    async def get_available_for_dates(
        self, start_date: date, end_date: date, category_id: Optional[int] = None
    ) -> list[Equipment]:
        return await self.repo.get_available_for_dates(start_date, end_date, category_id)

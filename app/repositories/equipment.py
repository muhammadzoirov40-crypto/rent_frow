from typing import Optional
from datetime import date
from sqlalchemy import select, and_, or_, not_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.models.equipment import Equipment
from app.models.category import Category
from app.models.booking import Booking
from app.core.enums import EquipmentStatus, BookingStatus
from app.repositories.base import BaseRepository


class EquipmentRepository(BaseRepository[Equipment]):
    def __init__(self, db: AsyncSession):
        super().__init__(Equipment, db)

    async def get_by_serial_number(self, serial_number: str) -> Optional[Equipment]:
        result = await self.db.execute(
            select(Equipment).where(Equipment.serial_number == serial_number)
        )
        return result.scalar_one_or_none()

    async def get_available_for_dates(
        self, start_date: date, end_date: date, category_id: Optional[int] = None
    ) -> list[Equipment]:
        booked_equipment_ids = (
            select(Booking.equipment_id)
            .where(
                and_(
                    Booking.status.in_([
                        BookingStatus.PENDING,
                        BookingStatus.CONFIRMED,
                    ]),
                    Booking.start_date <= end_date,
                    Booking.end_date >= start_date,
                )
            )
            .scalar_subquery()
        )

        query = select(Equipment).where(
            and_(
                Equipment.is_active == True,
                Equipment.status == EquipmentStatus.AVAILABLE,
                not_(Equipment.id.in_(booked_equipment_ids)),
            )
        )

        if category_id is not None:
            query = query.where(Equipment.category_id == category_id)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def check_availability(
        self, equipment_id: int, start_date: date, end_date: date, exclude_booking_id: Optional[int] = None
    ) -> Optional[int]:
        query = select(Booking.id).where(
            and_(
                Booking.equipment_id == equipment_id,
                Booking.status.in_([
                    BookingStatus.PENDING,
                    BookingStatus.CONFIRMED,
                ]),
                Booking.start_date <= end_date,
                Booking.end_date >= start_date,
            )
        )

        if exclude_booking_id is not None:
            query = query.where(Booking.id != exclude_booking_id)

        result = await self.db.execute(query)
        conflicting = result.scalar_one_or_none()
        return conflicting

    async def get_available_for_dates_with_lock(
        self, equipment_id: int, start_date: date, end_date: date
    ) -> Optional[int]:
        from sqlalchemy import text
        await self.db.execute(
            text("SELECT id FROM equipment WHERE id = :id FOR UPDATE"),
            {"id": equipment_id},
        )
        return await self.check_availability(equipment_id, start_date, end_date)

    async def search(
        self,
        query_str: Optional[str] = None,
        category_id: Optional[int] = None,
        status: Optional[EquipmentStatus] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Equipment]:
        query = select(Equipment).options(joinedload(Equipment.category))

        if query_str:
            query = query.where(
                or_(
                    Equipment.name.ilike(f"%{query_str}%"),
                    Equipment.serial_number.ilike(f"%{query_str}%"),
                    Equipment.description.ilike(f"%{query_str}%"),
                )
            )
        if category_id is not None:
            query = query.where(Equipment.category_id == category_id)
        if status is not None:
            query = query.where(Equipment.status == status)
        if is_active is not None:
            query = query.where(Equipment.is_active == is_active)

        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().unique().all())

    async def count_filtered(
        self,
        query_str: Optional[str] = None,
        category_id: Optional[int] = None,
        status: Optional[EquipmentStatus] = None,
        is_active: Optional[bool] = None,
    ) -> int:
        from sqlalchemy import func
        query = select(func.count()).select_from(Equipment)

        if query_str:
            query = query.where(
                or_(
                    Equipment.name.ilike(f"%{query_str}%"),
                    Equipment.serial_number.ilike(f"%{query_str}%"),
                    Equipment.description.ilike(f"%{query_str}%"),
                )
            )
        if category_id is not None:
            query = query.where(Equipment.category_id == category_id)
        if status is not None:
            query = query.where(Equipment.status == status)
        if is_active is not None:
            query = query.where(Equipment.is_active == is_active)

        result = await self.db.execute(query)
        return result.scalar_one()

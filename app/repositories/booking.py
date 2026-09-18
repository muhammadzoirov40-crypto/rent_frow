from typing import Optional
from datetime import date
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.booking import Booking
from app.core.enums import BookingStatus
from app.repositories.base import BaseRepository


class BookingRepository(BaseRepository[Booking]):
    def __init__(self, db: AsyncSession):
        super().__init__(Booking, db)

    async def get_customer_bookings(
        self, customer_id: int, status: Optional[BookingStatus] = None, skip: int = 0, limit: int = 20
    ) -> list[Booking]:
        query = select(Booking).where(Booking.customer_id == customer_id)
        if status:
            query = query.where(Booking.status == status)
        query = query.order_by(Booking.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_customer_bookings(self, customer_id: int, status: Optional[BookingStatus] = None) -> int:
        query = select(func.count()).select_from(Booking).where(Booking.customer_id == customer_id)
        if status:
            query = query.where(Booking.status == status)
        result = await self.db.execute(query)
        return result.scalar_one()

    async def get_all_bookings(
        self, status: Optional[BookingStatus] = None, skip: int = 0, limit: int = 20
    ) -> list[Booking]:
        query = select(Booking)
        if status:
            query = query.where(Booking.status == status)
        query = query.order_by(Booking.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_all_bookings(self, status: Optional[BookingStatus] = None) -> int:
        query = select(func.count()).select_from(Booking)
        if status:
            query = query.where(Booking.status == status)
        result = await self.db.execute(query)
        return result.scalar_one()

    async def has_active_booking_for_equipment(self, equipment_id: int) -> bool:
        result = await self.db.execute(
            select(func.count()).select_from(Booking).where(
                and_(
                    Booking.equipment_id == equipment_id,
                    Booking.status.in_([
                        BookingStatus.PENDING,
                        BookingStatus.CONFIRMED,
                    ]),
                )
            )
        )
        return result.scalar_one() > 0

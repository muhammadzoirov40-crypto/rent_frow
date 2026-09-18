from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rental import Rental
from app.core.enums import RentalStatus
from app.repositories.base import BaseRepository


class RentalRepository(BaseRepository[Rental]):
    def __init__(self, db: AsyncSession):
        super().__init__(Rental, db)

    async def get_by_booking_id(self, booking_id: int) -> Optional[Rental]:
        result = await self.db.execute(
            select(Rental).where(Rental.booking_id == booking_id)
        )
        return result.scalar_one_or_none()

    async def get_customer_rentals(
        self, customer_id: int, status: Optional[RentalStatus] = None, skip: int = 0, limit: int = 20
    ) -> list[Rental]:
        query = select(Rental).where(Rental.customer_id == customer_id)
        if status:
            query = query.where(Rental.status == status)
        query = query.order_by(Rental.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_all_rentals(
        self, status: Optional[RentalStatus] = None, skip: int = 0, limit: int = 20
    ) -> list[Rental]:
        query = select(Rental)
        if status:
            query = query.where(Rental.status == status)
        query = query.order_by(Rental.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_active_rentals(self) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Rental).where(
                Rental.status.in_([RentalStatus.ACTIVE, RentalStatus.PICKED_UP])
            )
        )
        return result.scalar_one()

    async def count_all_rentals(self) -> int:
        result = await self.db.execute(select(func.count()).select_from(Rental))
        return result.scalar_one()

    async def count_customer_rentals(self, customer_id: int) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Rental).where(Rental.customer_id == customer_id)
        )
        return result.scalar_one()

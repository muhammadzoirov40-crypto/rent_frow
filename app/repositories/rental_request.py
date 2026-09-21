from typing import Optional
from datetime import date
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rental_request import RentalRequest, RentalRequestStatus
from app.repositories.base import BaseRepository


class RentalRequestRepository(BaseRepository[RentalRequest]):
    def __init__(self, db: AsyncSession):
        super().__init__(RentalRequest, db)

    async def get_by_renter(self, renter_id: int, skip: int = 0, limit: int = 20) -> list[RentalRequest]:
        result = await self.db.execute(
            select(RentalRequest)
            .where(RentalRequest.renter_id == renter_id)
            .order_by(RentalRequest.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_owner(self, owner_id: int, skip: int = 0, limit: int = 20) -> list[RentalRequest]:
        result = await self.db.execute(
            select(RentalRequest)
            .where(RentalRequest.owner_id == owner_id)
            .order_by(RentalRequest.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_by_renter(self, renter_id: int) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(RentalRequest).where(RentalRequest.renter_id == renter_id)
        )
        return result.scalar_one()

    async def count_by_owner(self, owner_id: int) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(RentalRequest).where(RentalRequest.owner_id == owner_id)
        )
        return result.scalar_one()

    async def check_date_conflicts(
        self,
        listing_id: int,
        start_date: date,
        end_date: date,
        exclude_id: Optional[int] = None,
    ) -> bool:
        query = select(func.count()).select_from(RentalRequest).where(
            RentalRequest.listing_id == listing_id,
            RentalRequest.status.in_([
                RentalRequestStatus.PENDING,
                RentalRequestStatus.ACCEPTED,
            ]),
            RentalRequest.start_date <= end_date,
            RentalRequest.end_date >= start_date,
        )
        if exclude_id is not None:
            query = query.where(RentalRequest.id != exclude_id)
        result = await self.db.execute(query)
        count = result.scalar_one()
        return count > 0

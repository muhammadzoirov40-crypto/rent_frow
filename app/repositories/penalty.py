from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.penalty import Penalty
from app.core.enums import PenaltyStatus
from app.repositories.base import BaseRepository


class PenaltyRepository(BaseRepository[Penalty]):
    def __init__(self, db: AsyncSession):
        super().__init__(Penalty, db)

    async def get_by_rental_id(self, rental_id: int) -> list[Penalty]:
        result = await self.db.execute(
            select(Penalty).where(Penalty.rental_id == rental_id)
        )
        return list(result.scalars().all())

    async def get_customer_penalties(
        self, customer_id: int, status: Optional[PenaltyStatus] = None
    ) -> list[Penalty]:
        query = select(Penalty).where(Penalty.customer_id == customer_id)
        if status:
            query = query.where(Penalty.status == status)
        query = query.order_by(Penalty.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_total_penalties_amount(self) -> float:
        result = await self.db.execute(
            select(func.coalesce(func.sum(Penalty.amount), 0.0))
            .where(Penalty.status == PenaltyStatus.PAID)
        )
        return float(result.scalar_one())

    async def get_customer_penalties_total(self, customer_id: int) -> float:
        result = await self.db.execute(
            select(func.coalesce(func.sum(Penalty.amount), 0.0)).where(
                Penalty.customer_id == customer_id,
                Penalty.status == PenaltyStatus.PAID,
            )
        )
        return float(result.scalar_one())

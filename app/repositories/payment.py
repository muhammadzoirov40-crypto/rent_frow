from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.payment import Payment
from app.core.enums import PaymentStatus, PaymentType
from app.repositories.base import BaseRepository


class PaymentRepository(BaseRepository[Payment]):
    def __init__(self, db: AsyncSession):
        super().__init__(Payment, db)

    async def get_by_booking_id(self, booking_id: int) -> list[Payment]:
        result = await self.db.execute(
            select(Payment).where(Payment.booking_id == booking_id).order_by(Payment.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_customer_payments(
        self, customer_id: int, status: Optional[PaymentStatus] = None, skip: int = 0, limit: int = 20
    ) -> list[Payment]:
        query = select(Payment).where(Payment.customer_id == customer_id)
        if status:
            query = query.where(Payment.status == status)
        query = query.order_by(Payment.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_all_payments(
        self, status: Optional[PaymentStatus] = None, skip: int = 0, limit: int = 20
    ) -> list[Payment]:
        query = select(Payment)
        if status:
            query = query.where(Payment.status == status)
        query = query.order_by(Payment.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_total_revenue(self) -> float:
        from sqlalchemy import case
        result = await self.db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0.0)).where(
                Payment.status == PaymentStatus.PAID,
                Payment.payment_type != PaymentType.REFUND,
            )
        )
        return float(result.scalar_one())

    async def count_customer_payments(self, customer_id: int) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Payment).where(Payment.customer_id == customer_id)
        )
        return result.scalar_one()

    async def count_all_payments(self) -> int:
        result = await self.db.execute(select(func.count()).select_from(Payment))
        return result.scalar_one()

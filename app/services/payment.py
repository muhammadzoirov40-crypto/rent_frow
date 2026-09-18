from typing import Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.payment import PaymentRepository
from app.repositories.booking import BookingRepository
from app.repositories.audit_log import AuditLogRepository
from app.schemas.payment import PaymentCreate
from app.models.payment import Payment
from app.core.enums import PaymentStatus, PaymentType, BookingStatus


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.payment_repo = PaymentRepository(db)
        self.booking_repo = BookingRepository(db)
        self.audit_repo = AuditLogRepository(db)

    async def create(self, customer_id: int, data: PaymentCreate) -> Payment:
        booking = await self.booking_repo.get_by_id(data.booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        if booking.customer_id != customer_id:
            raise HTTPException(status_code=403, detail="Access denied")

        if booking.status != BookingStatus.CONFIRMED:
            raise HTTPException(
                status_code=400,
                detail="Payment can only be made for confirmed bookings",
            )

        transaction_id = data.transaction_id or str(uuid.uuid4())

        payment = await self.payment_repo.create(
            booking_id=data.booking_id,
            customer_id=customer_id,
            amount=data.amount,
            payment_type=data.payment_type,
            transaction_id=transaction_id,
            status=PaymentStatus.PENDING,
        )

        await self.audit_repo.create(
            user_id=customer_id,
            action="payment_created",
            entity_type="payment",
            entity_id=payment.id,
            new_data={
                "amount": data.amount,
                "payment_type": data.payment_type.value,
                "booking_id": data.booking_id,
            },
        )

        return payment

    async def confirm_payment(self, admin_id: int, payment_id: int) -> Payment:
        payment = await self.payment_repo.get_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        if payment.status != PaymentStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot confirm payment in {payment.status.value} status",
            )

        old_status = payment.status.value
        payment = await self.payment_repo.update(payment, status=PaymentStatus.PAID)

        await self.audit_repo.create(
            user_id=admin_id,
            action="payment_completed",
            entity_type="payment",
            entity_id=payment.id,
            old_data={"status": old_status},
            new_data={"status": PaymentStatus.PAID.value},
        )

        return payment

    async def get_customer_payments(
        self, customer_id: int, status: Optional[PaymentStatus] = None, skip: int = 0, limit: int = 20
    ) -> tuple[list[Payment], int]:
        items = await self.payment_repo.get_customer_payments(customer_id, status, skip, limit)
        total = await self.payment_repo.count_customer_payments(customer_id)
        return items, total

    async def get_all_payments(
        self, status: Optional[PaymentStatus] = None, skip: int = 0, limit: int = 20
    ) -> tuple[list[Payment], int]:
        items = await self.payment_repo.get_all_payments(status, skip, limit)
        total = await self.payment_repo.count_all_payments()
        return items, total

    async def get_by_id(self, payment_id: int) -> Payment:
        payment = await self.payment_repo.get_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        return payment

    async def get_by_booking(self, booking_id: int) -> list[Payment]:
        return await self.payment_repo.get_by_booking_id(booking_id)

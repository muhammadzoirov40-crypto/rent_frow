from typing import Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.payment import PaymentRepository
from app.repositories.booking import BookingRepository
from app.repositories.rental_request import RentalRequestRepository
from app.repositories.audit_log import AuditLogRepository
from app.schemas.payment import PaymentCreate
from app.models.payment import Payment
from app.core.enums import (
    BookingStatus,
    PaymentStatus,
    PaymentType,
    RentalRequestStatus,
)


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.payment_repo = PaymentRepository(db)
        self.booking_repo = BookingRepository(db)
        self.request_repo = RentalRequestRepository(db)
        self.audit_repo = AuditLogRepository(db)

    async def create(self, customer_id: int, data: PaymentCreate) -> Payment:
        if data.rental_request_id is not None:
            return await self._create_for_rental_request(customer_id, data)
        return await self._create_for_booking(customer_id, data)

    async def _create_for_rental_request(
        self, customer_id: int, data: PaymentCreate
    ) -> Payment:
        """The flow the site actually runs on: the owner has accepted the
        request, now the renter pays for it. The amount is read from the
        request so the client cannot name its own price."""
        request = await self.request_repo.get_by_id(data.rental_request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Rental request not found")

        if request.renter_id != customer_id:
            raise HTTPException(status_code=403, detail="Access denied")

        if request.status != RentalRequestStatus.ACCEPTED:
            raise HTTPException(
                status_code=400,
                detail="Payment can only be made for an accepted rental request",
            )

        for existing in await self.payment_repo.get_by_rental_request_id(request.id):
            if existing.status in (PaymentStatus.PENDING, PaymentStatus.PAID):
                raise HTTPException(
                    status_code=400,
                    detail=f"Payment is already {existing.status.value} for this request",
                )

        amount = float(request.total_price)
        payment = await self.payment_repo.create(
            booking_id=None,
            rental_request_id=request.id,
            customer_id=customer_id,
            amount=amount,
            payment_type=data.payment_type,
            transaction_id=data.transaction_id or str(uuid.uuid4()),
            status=PaymentStatus.PENDING,
        )

        await self.audit_repo.create(
            user_id=customer_id,
            action="payment_created",
            entity_type="payment",
            entity_id=payment.id,
            new_data={
                "amount": amount,
                "payment_type": data.payment_type.value,
                "rental_request_id": request.id,
            },
        )
        return payment

    async def _create_for_booking(self, customer_id: int, data: PaymentCreate) -> Payment:
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

    async def get_by_rental_request(self, rental_request_id: int) -> list[Payment]:
        return await self.payment_repo.get_by_rental_request_id(rental_request_id)

    async def payments_for_request(
        self, user_id: int, is_admin: bool, rental_request_id: int
    ) -> list[Payment]:
        """Payments against one rental request, readable only by the people
        on it — the renter who paid, the owner who confirms, or an admin."""
        request = await self.request_repo.get_by_id(rental_request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Rental request not found")
        if not is_admin and user_id not in (request.renter_id, request.owner_id):
            raise HTTPException(status_code=403, detail="Access denied")
        return await self.payment_repo.get_by_rental_request_id(rental_request_id)

    async def confirm_payment_as(
        self, user_id: int, is_admin: bool, payment_id: int
    ) -> Payment:
        """Mark a pending payment as paid.

        An admin may confirm anything; an owner may confirm a payment for a
        request on their own listing, because in this marketplace the owner is
        the one holding the money. Anyone else is refused.
        """
        payment = await self.get_by_id(payment_id)
        if not is_admin:
            request = payment.rental_request
            if request is None or request.owner_id != user_id:
                raise HTTPException(status_code=403, detail="Access denied")
        return await self.confirm_payment(user_id, payment_id)

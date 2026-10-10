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
from app.models.rental_request import RentalRequest
from app.models.user import User
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
        request, amount = await self._validate_for_rental_request(customer_id, data)

        # Rent and deposit are two separate lines: the listing page shows both,
        # so both have to be collectable — and each is guarded on its own, so
        # paying the rent does not lock the deposit out.
        for existing in await self.payment_repo.get_by_rental_request_id(request.id):
            if existing.payment_type != data.payment_type:
                continue
            if existing.status in (PaymentStatus.PENDING, PaymentStatus.PAID):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"{data.payment_type.value} is already "
                        f"{existing.status.value} for this request"
                    ),
                )

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

    async def _validate_for_rental_request(
        self, customer_id: int, data: PaymentCreate
    ) -> tuple[RentalRequest, float]:
        """Everything but the row itself: who may pay, against which request,
        in which state, as which line, for how much.

        Shared by the plain endpoint and the DC checkout so the two can never
        drift apart — the checkout must refuse exactly whom the plain one
        refuses, and charge exactly what it charges.
        """
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

        if data.payment_type not in (PaymentType.BOOKING, PaymentType.DEPOSIT):
            raise HTTPException(
                status_code=400,
                detail="A rental request is paid either as rent or as a deposit",
            )

        if data.payment_type == PaymentType.DEPOSIT:
            amount = float(request.deposit_amount)
            if amount <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="This listing asks for no deposit",
                )
        else:
            amount = float(request.total_price)
        return request, amount

    async def _rental_dc_account(self, request: RentalRequest) -> str:
        """The DC account a rental payment is collected under: the listing
        owner's own registered account, and nothing else.

        Routing rent to the person who actually rents the thing out is the
        whole point, and the only alternative — quietly handing the money to
        the platform instead — is worse than refusing outright: the renter
        would pay, the owner would never see it, and both would have to sort
        it out by hand afterwards. So an owner who has not registered a wallet
        stops the checkout with a code the front end turns into a sentence the
        renter can act on. The fix is one field, on the owner's own profile or
        typed while posting the listing.
        """
        owner = await self.db.get(User, request.owner_id)
        account = (owner.dc_account or "").strip() if owner else ""
        if not account:
            raise HTTPException(
                status_code=400,
                detail="OWNER_HAS_NO_DC_ACCOUNT",
            )
        return account

    async def pay_dc(self, customer_id: int, data: PaymentCreate) -> dict:
        """The same payment as :meth:`create`, pointed at the DC checkout.

        The row is PENDING either way and the amount is still the request's;
        what is new is the reference this payment will be settled under,
        bound to a waiting intent. A checkout that was opened and not
        finished is re-opened with its own reference instead of refused —
        the provider's page is one click from being abandoned and one click
        from being needed again — while a payment already PAID is still
        refused, exactly as before.
        """
        if data.rental_request_id is None:
            raise HTTPException(
                status_code=400, detail="DC payment is for rental requests"
            )
        request, amount = await self._validate_for_rental_request(customer_id, data)

        payment: Payment | None = None
        for existing in await self.payment_repo.get_by_rental_request_id(request.id):
            if existing.payment_type != data.payment_type:
                continue
            if existing.status == PaymentStatus.PAID:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"{data.payment_type.value} is already "
                        f"{existing.status.value} for this request"
                    ),
                )
            if existing.status == PaymentStatus.PENDING:
                payment = existing
                break

        if payment is None:
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
                    "via": "paydc",
                },
            )

        from app.services import topup as topup_service

        intent = await topup_service.pending_payment_intent(self.db, payment.id)
        if intent is not None:
            reference = intent.reference
        else:
            opened = await topup_service.open_payment_intent(
                self.db,
                user_id=payment.customer_id,
                payment_id=payment.id,
                amount=float(payment.amount),
            )
            reference = opened["reference"]

        return {
            "payment": payment,
            "reference": reference,
            "url": topup_service.payment_url(
                customer_id,
                float(payment.amount),
                reference,
                account=await self._rental_dc_account(request),
            ),
        }

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

    async def payments_for_booking(
        self, booking_id: int, user_id: int, is_admin: bool = False
    ) -> list[Payment]:
        """What has been paid against one booking - to its own customer, or to
        an admin.

        The plain ``get_by_booking`` answers any question put to it, so a route
        that uses it has to establish who is asking first; this is that check,
        in the same shape as ``payments_for_request``. Without it, switching the
        route from a role gate to an identity gate would have opened somebody
        else's payment history to everyone.
        """
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        if not is_admin and booking.customer_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
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

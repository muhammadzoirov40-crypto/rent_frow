from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_admin, require_auth, CurrentUser
from app.schemas.payment import (
    PaymentCreate,
    PaymentPayDc,
    PaymentResponse,
    PaymentConfirm,
)
from app.schemas.base import APIResponse, PaginatedResponse
from app.services.payment import PaymentService
from app.services import topup as topup_service
from app.core.enums import PaymentStatus

router = APIRouter(prefix="/payments", tags=["Payments"])


async def _pin_reference(db: AsyncSession, payments) -> None:
    """Give each payment its DC reference, when a checkout was ever opened
    for it.

    One extra query covers the whole batch; a payment nobody opened a link
    for stays None, so the field is always present in the response instead
    of conditionally there."""
    rows = list(payments)
    if not rows:
        return
    intents = await topup_service.latest_payment_intents(db, [p.id for p in rows])
    for payment in rows:
        intent = intents.get(payment.id)
        payment.__dict__["payment_reference"] = intent.reference if intent else None

# Who may act on a payment is decided by the payment itself - is this caller
# the renter who paid, the owner who confirms, the customer of this booking - 
# not by the role their account happens to carry. That distinction matters:
# an OWNER who rents from somebody else must still be able to pay, and the
# service below already refuses anybody who is not on the request. A role gate
# here only ever refused people who were entitled to it.


@router.post("", response_model=APIResponse[PaymentResponse])
async def create_payment(
    data: PaymentCreate,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)
    payment = await service.create(current_user.user_id, data)
    return APIResponse(message="Payment created successfully", data=payment)


@router.post("/pay-dc", response_model=APIResponse[PaymentPayDc])
async def pay_request_with_dc(
    data: PaymentCreate,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Open the DC Wallet (Dushanbe City) checkout for an accepted request's
    rent or deposit.

    The payment row and its amount come from the same server-side rules as
    `POST /payments`; what is new is the reference the provider echoes back,
    which is how the callback finds this exact payment and how the operator
    matches it in the statement. A checkout left half-finished re-opens its
    own link instead of dead-ending the renter."""
    if data.rental_request_id is None:
        raise HTTPException(
            status_code=400, detail="DC payment is for rental requests"
        )
    service = PaymentService(db)
    result = await service.pay_dc(current_user.user_id, data)
    payment = result["payment"]
    payment.__dict__["payment_reference"] = result["reference"]
    return APIResponse(
        message="Payment link opened",
        data=PaymentPayDc(
            url=result["url"],
            reference=result["reference"],
            payment=PaymentResponse.model_validate(payment),
        ),
    )


@router.get("", response_model=PaginatedResponse[PaymentResponse])
async def list_my_payments(
    status: PaymentStatus | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)
    items, total = await service.get_customer_payments(
        current_user.user_id, status, skip, limit
    )
    await _pin_reference(db, items)
    return PaginatedResponse(
        data=items, total=total, page=(skip // limit) + 1, page_size=limit
    )


@router.get("/admin/all", response_model=PaginatedResponse[PaymentResponse])
async def list_all_payments(
    status: PaymentStatus | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)
    items, total = await service.get_all_payments(status, skip, limit)
    await _pin_reference(db, items)
    return PaginatedResponse(
        data=items, total=total, page=(skip // limit) + 1, page_size=limit
    )


@router.get("/booking/{booking_id}", response_model=APIResponse[list[PaymentResponse]])
async def get_booking_payments(
    booking_id: int,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)
    payments = await service.payments_for_booking(
        booking_id, current_user.user_id, current_user.is_admin
    )
    return APIResponse(data=payments)


@router.get(
    "/rental-request/{rental_request_id}",
    response_model=APIResponse[list[PaymentResponse]],
)
async def get_rental_request_payments(
    rental_request_id: int,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """What has been paid against one rental request. Declared before
    /{payment_id} so the literal path is not swallowed by the id route."""
    service = PaymentService(db)
    payments = await service.payments_for_request(
        current_user.user_id, current_user.is_admin, rental_request_id
    )
    await _pin_reference(db, payments)
    return APIResponse(data=payments)


@router.get("/{payment_id}", response_model=APIResponse[PaymentResponse])
async def get_payment(
    payment_id: int,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)
    payment = await service.get_by_id(payment_id)
    if not current_user.is_admin and payment.customer_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    await _pin_reference(db, [payment])
    return APIResponse(data=payment)


@router.post("/{payment_id}/confirm", response_model=APIResponse[PaymentResponse])
async def confirm_payment(
    payment_id: int,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """An admin confirms anything; the owner of the listing confirms the
    payment made on their own rental request."""
    service = PaymentService(db)
    payment = await service.confirm_payment_as(
        current_user.user_id, current_user.is_admin, payment_id
    )
    return APIResponse(message="Payment confirmed successfully", data=payment)

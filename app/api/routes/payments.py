from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_admin, require_customer, CurrentUser
from app.schemas.payment import PaymentCreate, PaymentResponse, PaymentConfirm
from app.schemas.base import APIResponse, PaginatedResponse
from app.services.payment import PaymentService
from app.core.enums import PaymentStatus

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("", response_model=APIResponse[PaymentResponse])
async def create_payment(
    data: PaymentCreate,
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)
    payment = await service.create(current_user.user_id, data)
    return APIResponse(message="Payment created successfully", data=payment)


@router.get("", response_model=PaginatedResponse[PaymentResponse])
async def list_my_payments(
    status: PaymentStatus | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)
    items, total = await service.get_customer_payments(
        current_user.user_id, status, skip, limit
    )
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
    return PaginatedResponse(
        data=items, total=total, page=(skip // limit) + 1, page_size=limit
    )


@router.get("/booking/{booking_id}", response_model=APIResponse[list[PaymentResponse]])
async def get_booking_payments(
    booking_id: int,
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)
    payments = await service.get_by_booking(booking_id)
    return APIResponse(data=payments)


@router.get("/{payment_id}", response_model=APIResponse[PaymentResponse])
async def get_payment(
    payment_id: int,
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)
    payment = await service.get_by_id(payment_id)
    if not current_user.is_admin and payment.customer_id != current_user.user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied")
    return APIResponse(data=payment)


@router.post("/{payment_id}/confirm", response_model=APIResponse[PaymentResponse])
async def confirm_payment(
    payment_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)
    payment = await service.confirm_payment(current_user.user_id, payment_id)
    return APIResponse(message="Payment confirmed successfully", data=payment)

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_admin, require_customer, CurrentUser
from app.core.enums import BookingStatus
from app.schemas.booking import BookingCreate, BookingResponse
from app.schemas.base import APIResponse, PaginatedResponse
from app.services.booking import BookingService

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post("", response_model=APIResponse[BookingResponse])
async def create_booking(
    data: BookingCreate,
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = BookingService(db)
    booking = await service.create(current_user.user_id, data)
    return APIResponse(message="Booking created successfully", data=booking)


@router.get("", response_model=PaginatedResponse[BookingResponse])
async def list_bookings(
    status: BookingStatus | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = BookingService(db)
    items, total = await service.get_customer_bookings(
        current_user.user_id, status, skip, limit
    )
    return PaginatedResponse(
        data=items, total=total, page=(skip // limit) + 1, page_size=limit
    )


@router.get("/admin/all", response_model=PaginatedResponse[BookingResponse])
async def list_all_bookings(
    status: BookingStatus | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BookingService(db)
    items, total = await service.get_all_bookings(status, skip, limit)
    return PaginatedResponse(
        data=items, total=total, page=(skip // limit) + 1, page_size=limit
    )


@router.get("/{booking_id}", response_model=APIResponse[BookingResponse])
async def get_booking(
    booking_id: int,
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = BookingService(db)
    booking = await service.get_by_id(booking_id)
    if not current_user.is_admin and booking.customer_id != current_user.user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied")
    return APIResponse(data=booking)


@router.post("/{booking_id}/cancel", response_model=APIResponse[BookingResponse])
async def cancel_booking(
    booking_id: int,
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = BookingService(db)
    booking = await service.cancel_booking(current_user.user_id, booking_id)
    return APIResponse(message="Booking cancelled successfully", data=booking)


@router.post("/{booking_id}/confirm", response_model=APIResponse[BookingResponse])
async def confirm_booking(
    booking_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BookingService(db)
    booking = await service.confirm_booking(current_user.user_id, booking_id)
    return APIResponse(message="Booking confirmed successfully", data=booking)


@router.post("/{booking_id}/reject", response_model=APIResponse[BookingResponse])
async def reject_booking(
    booking_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BookingService(db)
    booking = await service.reject_booking(current_user.user_id, booking_id)
    return APIResponse(message="Booking rejected successfully", data=booking)

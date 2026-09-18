from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_admin, require_customer, CurrentUser
from app.schemas.rental import RentalResponse, ReturnRequest
from app.schemas.base import APIResponse, PaginatedResponse
from app.services.rental import RentalService
from app.core.enums import RentalStatus

router = APIRouter(prefix="/rentals", tags=["Rentals"])


@router.get("", response_model=PaginatedResponse[RentalResponse])
async def list_my_rentals(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = RentalService(db)
    items, total = await service.get_customer_rentals(current_user.user_id, skip, limit)
    return PaginatedResponse(
        data=items, total=total, page=(skip // limit) + 1, page_size=limit
    )


@router.get("/admin/all", response_model=PaginatedResponse[RentalResponse])
async def list_all_rentals(
    status: RentalStatus | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = RentalService(db)
    items, total = await service.get_all_rentals(status, skip, limit)
    return PaginatedResponse(
        data=items, total=total, page=(skip // limit) + 1, page_size=limit
    )


@router.get("/{rental_id}", response_model=APIResponse[RentalResponse])
async def get_rental(
    rental_id: int,
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = RentalService(db)
    rental = await service.get_by_id(rental_id)
    if not current_user.is_admin and rental.customer_id != current_user.user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied")
    return APIResponse(data=rental)


@router.post("/{rental_id}/request-return", response_model=APIResponse[RentalResponse])
async def request_return(
    rental_id: int,
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = RentalService(db)
    rental = await service.request_return(current_user.user_id, rental_id)
    return APIResponse(message="Return requested successfully", data=rental)


@router.post("/admin/create-from-booking", response_model=APIResponse[RentalResponse])
async def create_rental_from_booking(
    booking_id: int = Query(...),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = RentalService(db)
    rental = await service.create_from_booking(current_user.user_id, booking_id)
    return APIResponse(message="Rental created from booking", data=rental)


@router.post("/admin/{rental_id}/pickup", response_model=APIResponse[RentalResponse])
async def pickup_rental(
    rental_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = RentalService(db)
    rental = await service.pickup(current_user.user_id, rental_id)
    return APIResponse(message="Equipment picked up", data=rental)


@router.post("/admin/{rental_id}/activate", response_model=APIResponse[RentalResponse])
async def activate_rental(
    rental_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = RentalService(db)
    rental = await service.activate(current_user.user_id, rental_id)
    return APIResponse(message="Rental activated", data=rental)


@router.post("/admin/{rental_id}/accept-return", response_model=APIResponse[RentalResponse])
async def accept_return(
    rental_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = RentalService(db)
    rental = await service.accept_return(current_user.user_id, rental_id)
    return APIResponse(message="Return accepted", data=rental)


@router.post("/admin/{rental_id}/start-inspection", response_model=APIResponse[RentalResponse])
async def start_inspection(
    rental_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = RentalService(db)
    rental = await service.start_inspection(current_user.user_id, rental_id)
    return APIResponse(message="Inspection started", data=rental)


@router.post("/admin/{rental_id}/complete", response_model=APIResponse[RentalResponse])
async def complete_rental(
    rental_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = RentalService(db)
    rental = await service.complete_rental(current_user.user_id, rental_id)
    return APIResponse(message="Rental completed", data=rental)

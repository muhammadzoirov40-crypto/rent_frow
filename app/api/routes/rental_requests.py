from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_auth, CurrentUser
from app.schemas.rental_request import RentalRequestCreate, RentalRequestResponse
from app.schemas.base import APIResponse, PaginatedResponse
from app.services.rental_request import RentalRequestService

router = APIRouter(prefix="/rental-requests", tags=["Rental Requests"])


def _to_response(req) -> RentalRequestResponse:
    return RentalRequestResponse(
        id=req.id,
        listing_id=req.listing_id,
        renter_id=req.renter_id,
        owner_id=req.owner_id,
        start_date=req.start_date,
        end_date=req.end_date,
        total_days=req.total_days,
        total_price=float(req.total_price),
        deposit_amount=float(req.deposit_amount),
        message=req.message,
        owner_response=req.owner_response,
        status=req.status,
        created_at=req.created_at,
        updated_at=req.updated_at,
        listing_title=req.listing.title if req.listing else None,
        renter_name=req.renter.display_name if req.renter else None,
        owner_name=req.owner.display_name if req.owner else None,
    )


@router.post("", response_model=APIResponse[RentalRequestResponse])
async def create_rental_request(
    data: RentalRequestCreate,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = RentalRequestService(db)
    req = await service.create(current_user.user_id, data)
    return APIResponse(message="Rental request created successfully", data=_to_response(req))


@router.get("/my", response_model=PaginatedResponse[RentalRequestResponse])
async def get_my_rental_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = RentalRequestService(db)
    skip = (page - 1) * page_size
    requests, total = await service.get_by_renter(current_user.user_id, skip, page_size)
    items = [_to_response(r) for r in requests]
    return PaginatedResponse(data=items, total=total, page=page, page_size=page_size)


@router.get("/owner", response_model=PaginatedResponse[RentalRequestResponse])
async def get_owner_rental_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = RentalRequestService(db)
    skip = (page - 1) * page_size
    requests, total = await service.get_by_owner(current_user.user_id, skip, page_size)
    items = [_to_response(r) for r in requests]
    return PaginatedResponse(data=items, total=total, page=page, page_size=page_size)


@router.patch("/{request_id}/accept", response_model=APIResponse[RentalRequestResponse])
async def accept_rental_request(
    request_id: int,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = RentalRequestService(db)
    req = await service.accept(request_id, current_user.user_id)
    return APIResponse(message="Rental request accepted", data=_to_response(req))


@router.patch("/{request_id}/reject", response_model=APIResponse[RentalRequestResponse])
async def reject_rental_request(
    request_id: int,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = RentalRequestService(db)
    req = await service.reject(request_id, current_user.user_id)
    return APIResponse(message="Rental request rejected", data=_to_response(req))


@router.patch("/{request_id}/cancel", response_model=APIResponse[RentalRequestResponse])
async def cancel_rental_request(
    request_id: int,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = RentalRequestService(db)
    req = await service.cancel(request_id, current_user.user_id)
    return APIResponse(message="Rental request cancelled", data=_to_response(req))


@router.patch("/{request_id}/complete", response_model=APIResponse[RentalRequestResponse])
async def complete_rental_request(
    request_id: int,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = RentalRequestService(db)
    req = await service.complete(request_id, current_user.user_id)
    return APIResponse(message="Rental request completed", data=_to_response(req))

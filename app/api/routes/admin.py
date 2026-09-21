from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_admin, CurrentUser
from app.core.enums import UserRole, ListingStatus
from app.schemas.statistics import StatisticsResponse, AuditLogResponse
from app.schemas.base import APIResponse, PaginatedResponse
from app.services.statistics import StatisticsService
from app.services.audit_log import AuditLogService
from app.schemas.user import UserResponse
from app.schemas.listing import ListingResponse, ListingListResponse, ListingImageResponse, ListingOwnerResponse
from app.schemas.rental_request import RentalRequestResponse
from app.repositories.user import UserRepository
from app.repositories.listing import ListingRepository
from app.repositories.rental_request import RentalRequestRepository
from app.models.user import User
from app.models.listing import Listing
from app.models.listing_image import ListingImage
from app.models.rental_request import RentalRequest

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", response_model=APIResponse[dict])
async def get_stats(
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user_repo = UserRepository(db)
    listing_repo = ListingRepository(db)
    rental_repo = RentalRequestRepository(db)

    total_users = await user_repo.count()
    active_listings = await db.execute(
        select(func.count()).select_from(Listing).where(Listing.status == ListingStatus.ACTIVE)
    )
    active_listings_count = active_listings.scalar_one()

    total_requests = await db.execute(select(func.count()).select_from(RentalRequest))
    total_requests_count = total_requests.scalar_one()

    completed_requests = await db.execute(
        select(func.count()).select_from(RentalRequest).where(
            RentalRequest.status.in_(["COMPLETED", "ACCEPTED"])
        )
    )
    completed_count = completed_requests.scalar_one()

    return APIResponse(data={
        "totalUsers": total_users,
        "activeListings": active_listings_count,
        "rentalRequests": total_requests_count,
        "completedRentals": completed_count,
    })


@router.get("/users", response_model=APIResponse[list[UserResponse]])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    users = await repo.get_all(skip, limit)
    result = []
    for u in users:
        ur = UserResponse.model_validate(u)
        ur.listing_count = len(u.listings) if u.listings else 0
        result.append(ur)
    return APIResponse(data=result)


@router.put("/users/{user_id}/block")
async def block_user(
    user_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await repo.update(user, is_active=False)
    return APIResponse(message="User blocked")


@router.put("/users/{user_id}/unblock")
async def unblock_user(
    user_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await repo.update(user, is_active=True)
    return APIResponse(message="User unblocked")


@router.put("/users/{user_id}/verify")
async def verify_user(
    user_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await repo.update(user, is_verified=True)
    return APIResponse(message="User verified")


class UpdateRoleRequest(BaseModel):
    role: UserRole


@router.patch("/users/{user_id}/role", response_model=APIResponse[UserResponse])
async def update_user_role(
    user_id: int,
    data: UpdateRoleRequest,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user = await repo.update(user, role=data.role)
    return APIResponse(data=UserResponse.model_validate(user))


@router.get("/users/by-email/{email}", response_model=APIResponse[UserResponse])
async def get_user_by_email(
    email: str,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    user = await repo.get_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return APIResponse(data=UserResponse.model_validate(user))


@router.get("/listings", response_model=APIResponse[list[ListingListResponse]])
async def admin_list_listings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = ListingRepository(db)
    query = (
        select(Listing)
        .order_by(Listing.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    listings = list(result.scalars().all())
    items = []
    for l in listings:
        primary = l.primary_image
        if primary and 'placeholder' in primary:
            primary = None
        items.append(ListingListResponse(
            id=l.id,
            title=l.title,
            price=float(l.price),
            price_unit=l.price_unit,
            city_name=l.city_rel.name if l.city_rel else None,
            primary_image=primary,
            views_count=l.views_count,
            average_rating=l.average_rating,
            created_at=l.created_at,
            is_favorited=False,
        ))
    return APIResponse(data=items)


@router.put("/listings/{listing_id}/approve")
async def approve_listing(
    listing_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = ListingRepository(db)
    listing = await repo.get_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    await repo.update(listing, is_verified=True, status=ListingStatus.ACTIVE)
    return APIResponse(message="Listing approved")


@router.put("/listings/{listing_id}/reject")
async def reject_listing(
    listing_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = ListingRepository(db)
    listing = await repo.get_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    await repo.update(listing, is_verified=False, status=ListingStatus.PAUSED)
    return APIResponse(message="Listing rejected")


@router.delete("/listings/{listing_id}")
async def admin_delete_listing(
    listing_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = ListingRepository(db)
    listing = await repo.get_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    await repo.delete(listing)
    return APIResponse(message="Listing deleted")


@router.get("/requests", response_model=APIResponse[list[RentalRequestResponse]])
async def admin_list_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = RentalRequestRepository(db)
    query = (
        select(RentalRequest)
        .order_by(RentalRequest.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    requests = list(result.scalars().all())
    items = []
    for r in requests:
        rr = RentalRequestResponse(
            id=r.id,
            listing_id=r.listing_id,
            renter_id=r.renter_id,
            owner_id=r.owner_id,
            start_date=r.start_date,
            end_date=r.end_date,
            total_days=r.total_days,
            total_price=float(r.total_price),
            deposit_amount=float(r.deposit_amount),
            message=r.message,
            owner_response=r.owner_response,
            status=r.status,
            created_at=r.created_at,
            updated_at=r.updated_at,
            listing_title=r.listing.title if r.listing else None,
            renter_name=r.renter.display_name if r.renter else None,
            owner_name=r.owner.display_name if r.owner else None,
        )
        items.append(rr)
    return APIResponse(data=items)


@router.get("/audit-logs", response_model=PaginatedResponse[AuditLogResponse])
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AuditLogService(db)
    items = await service.get_all(skip, limit)
    return PaginatedResponse(
        data=items, total=len(items), page=(skip // limit) + 1, page_size=limit
    )


@router.get("/audit-logs/entity/{entity_type}/{entity_id}")
async def get_entity_audit_logs(
    entity_type: str,
    entity_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AuditLogService(db)
    items = await service.get_by_entity(entity_type, entity_id)
    return APIResponse(data=items)

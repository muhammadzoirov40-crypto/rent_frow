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
from app.models.booking import Booking
from app.models.rental import Rental
from app.models.payment import Payment
from app.models.equipment import Equipment
from app.models.review import Review
from app.models.post import Post
from app.models.penalty import Penalty

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


@router.get("/crm", response_model=APIResponse[dict])
async def get_crm(
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    def _count_map(rows):
        return {str(k): int(v) for k, v in rows}

    async def _by_status(model, status_col):
        result = await db.execute(
            select(status_col, func.count()).group_by(status_col)
        )
        return _count_map(result.all())

    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    active_users = (
        await db.execute(
            select(func.count()).select_from(User).where(User.is_active == True)
        )
    ).scalar_one()
    verified_users = (
        await db.execute(
            select(func.count()).select_from(User).where(User.is_verified == True)
        )
    ).scalar_one()

    total_listings = (await db.execute(select(func.count()).select_from(Listing))).scalar_one()
    active_listings = (
        await db.execute(
            select(func.count()).select_from(Listing).where(Listing.status == ListingStatus.ACTIVE)
        )
    ).scalar_one()
    unverified_listings = (
        await db.execute(
            select(func.count()).select_from(Listing).where(Listing.is_verified == False)
        )
    ).scalar_one()

    total_equipment = (await db.execute(select(func.count()).select_from(Equipment))).scalar_one()
    total_requests = (await db.execute(select(func.count()).select_from(RentalRequest))).scalar_one()
    total_bookings = (await db.execute(select(func.count()).select_from(Booking))).scalar_one()
    total_rentals = (await db.execute(select(func.count()).select_from(Rental))).scalar_one()
    total_payments = (await db.execute(select(func.count()).select_from(Payment))).scalar_one()
    total_posts = (await db.execute(select(func.count()).select_from(Post))).scalar_one()
    total_reviews = (await db.execute(select(func.count()).select_from(Review))).scalar_one()
    total_penalties = (await db.execute(select(func.count()).select_from(Penalty))).scalar_one()

    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == "PAID")
    )
    total_revenue = float(revenue_result.scalar_one())

    requests_by_status = await _by_status(RentalRequest, RentalRequest.status)
    bookings_by_status = await _by_status(Booking, Booking.status)
    rentals_by_status = await _by_status(Rental, Rental.status)
    payments_by_status = await _by_status(Payment, Payment.status)
    listings_by_status = await _by_status(Listing, Listing.status)

    recent_requests_result = await db.execute(
        select(RentalRequest)
        .order_by(RentalRequest.created_at.desc())
        .limit(20)
    )
    recent_requests = list(recent_requests_result.scalars().all())

    recent_bookings_result = await db.execute(
        select(Booking).order_by(Booking.created_at.desc()).limit(20)
    )
    recent_bookings = list(recent_bookings_result.scalars().all())

    recent_rentals_result = await db.execute(
        select(Rental).order_by(Rental.created_at.desc()).limit(20)
    )
    recent_rentals = list(recent_rentals_result.scalars().all())

    recent_payments_result = await db.execute(
        select(Payment).order_by(Payment.created_at.desc()).limit(20)
    )
    recent_payments = list(recent_payments_result.scalars().all())

    recent_users_result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(20)
    )
    recent_users = list(recent_users_result.scalars().all())

    pipeline = []
    for r in recent_requests:
        pipeline.append({
            "type": "request",
            "id": r.id,
            "title": r.listing.title if r.listing else f"Request #{r.id}",
            "status": r.status.value if hasattr(r.status, "value") else str(r.status),
            "amount": float(r.total_price),
            "user": r.renter.display_name or r.renter.email if r.renter else None,
            "created_at": r.created_at.isoformat(),
        })
    for b in recent_bookings:
        pipeline.append({
            "type": "booking",
            "id": b.id,
            "title": b.equipment.name if b.equipment else f"Booking #{b.id}",
            "status": b.status.value if hasattr(b.status, "value") else str(b.status),
            "amount": float(b.total_price),
            "user": b.customer.display_name or b.customer.email if b.customer else None,
            "created_at": b.created_at.isoformat(),
        })
    for rent in recent_rentals:
        pipeline.append({
            "type": "rental",
            "id": rent.id,
            "title": rent.equipment.name if rent.equipment else f"Rental #{rent.id}",
            "status": rent.status.value if hasattr(rent.status, "value") else str(rent.status),
            "amount": None,
            "user": rent.customer.display_name or rent.customer.email if rent.customer else None,
            "created_at": rent.created_at.isoformat(),
        })
    for p in recent_payments:
        pipeline.append({
            "type": "payment",
            "id": p.id,
            "title": f"Payment #{p.id}",
            "status": p.status.value if hasattr(p.status, "value") else str(p.status),
            "amount": float(p.amount),
            "user": p.customer.display_name or p.customer.email if p.customer else None,
            "created_at": p.created_at.isoformat(),
        })
    for u in recent_users:
        pipeline.append({
            "type": "user",
            "id": u.id,
            "title": u.display_name or u.email,
            "status": "ACTIVE" if u.is_active else "BLOCKED",
            "amount": None,
            "user": u.email,
            "created_at": u.created_at.isoformat(),
        })
    pipeline.sort(key=lambda x: x["created_at"], reverse=True)
    pipeline = pipeline[:50]

    return APIResponse(data={
        "stats": {
            "totalUsers": int(total_users),
            "activeUsers": int(active_users),
            "verifiedUsers": int(verified_users),
            "totalListings": int(total_listings),
            "activeListings": int(active_listings),
            "unverifiedListings": int(unverified_listings),
            "totalEquipment": int(total_equipment),
            "totalRequests": int(total_requests),
            "totalBookings": int(total_bookings),
            "totalRentals": int(total_rentals),
            "totalPayments": int(total_payments),
            "totalPosts": int(total_posts),
            "totalReviews": int(total_reviews),
            "totalPenalties": int(total_penalties),
            "totalRevenue": total_revenue,
        },
        "requestsByStatus": requests_by_status,
        "bookingsByStatus": bookings_by_status,
        "rentalsByStatus": rentals_by_status,
        "paymentsByStatus": payments_by_status,
        "listingsByStatus": listings_by_status,
        "pipeline": pipeline,
        "recentRequests": [
            {
                "id": r.id,
                "listing_title": r.listing.title if r.listing else None,
                "renter_name": r.renter.display_name or r.renter.email if r.renter else None,
                "owner_name": r.owner.display_name or r.owner.email if r.owner else None,
                "status": r.status.value if hasattr(r.status, "value") else str(r.status),
                "total_price": float(r.total_price),
                "start_date": str(r.start_date),
                "end_date": str(r.end_date),
                "created_at": r.created_at.isoformat(),
            }
            for r in recent_requests
        ],
        "recentBookings": [
            {
                "id": b.id,
                "equipment_name": b.equipment.name if b.equipment else None,
                "customer_name": b.customer.display_name or b.customer.email if b.customer else None,
                "status": b.status.value if hasattr(b.status, "value") else str(b.status),
                "total_price": float(b.total_price),
                "start_date": str(b.start_date),
                "end_date": str(b.end_date),
                "created_at": b.created_at.isoformat(),
            }
            for b in recent_bookings
        ],
        "recentRentals": [
            {
                "id": rent.id,
                "equipment_name": rent.equipment.name if rent.equipment else None,
                "customer_name": rent.customer.display_name or rent.customer.email if rent.customer else None,
                "status": rent.status.value if hasattr(rent.status, "value") else str(rent.status),
                "created_at": rent.created_at.isoformat(),
            }
            for rent in recent_rentals
        ],
        "recentPayments": [
            {
                "id": p.id,
                "amount": float(p.amount),
                "payment_type": p.payment_type.value if hasattr(p.payment_type, "value") else str(p.payment_type),
                "status": p.status.value if hasattr(p.status, "value") else str(p.status),
                "customer_name": p.customer.display_name or p.customer.email if p.customer else None,
                "created_at": p.created_at.isoformat(),
            }
            for p in recent_payments
        ],
        "recentUsers": [
            {
                "id": u.id,
                "email": u.email,
                "display_name": u.display_name,
                "role": u.role.value if hasattr(u.role, "value") else str(u.role),
                "is_active": u.is_active,
                "is_verified": u.is_verified,
                "created_at": u.created_at.isoformat(),
            }
            for u in recent_users
        ],
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
    from app.services.listing import detach_listing_conversations
    await detach_listing_conversations(db, listing_id)
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

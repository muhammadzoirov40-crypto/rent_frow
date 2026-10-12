from fastapi import APIRouter, Depends, Query, HTTPException
import json
from datetime import datetime, timedelta
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_admin, CurrentUser
from app.core.enums import UserRole, ListingStatus, PostStatus, PaymentStatus, RentalRequestStatus, TopPromotionStatus
from app.schemas.statistics import StatisticsResponse, AuditLogResponse
from app.schemas.base import APIResponse, PaginatedResponse
from app.schemas.post import PostResponse
from app.schemas.wallet import AdminTopupResponse, AdminTopupListResponse
from app.utils.s3 import get_presigned_url
from app.services.statistics import StatisticsService
from app.services.audit_log import AuditLogService
from app.services.notification import NotificationService
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
from app.models.promotion import TopPromotion
from app.models.wallet import TopupIntent

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


@router.get("/pending-counts", response_model=APIResponse[dict])
async def get_pending_counts(
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Red badges for the admin panel's left menu: one query per queue so
    the operator sees the outstanding work without opening each tab."""
    async def _count(model, column, value) -> int:
        res = await db.execute(
            select(func.count()).select_from(model).where(column == value)
        )
        return int(res.scalar_one())

    return APIResponse(data={
        "payments": await _count(Payment, Payment.status, PaymentStatus.PENDING),
        "requests": await _count(RentalRequest, RentalRequest.status, RentalRequestStatus.PENDING),
        "posts": await _count(Post, Post.status, PostStatus.PENDING),
        "top": await _count(TopPromotion, TopPromotion.status, TopPromotionStatus.PENDING),
    })


@router.get("/chart-data", response_model=APIResponse[dict])
async def get_chart_data(
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=29)
    day_col = func.date(RentalRequest.created_at)
    rows = await db.execute(
        select(day_col, func.count())
        .where(RentalRequest.created_at >= since)
        .group_by(day_col)
    )
    counts = {str(d): int(c) for d, c in rows.all()}
    start = since.date()
    requests_by_day = [
        {"date": (start + timedelta(days=i)).isoformat(), "count": counts.get((start + timedelta(days=i)).isoformat(), 0)}
        for i in range(30)
    ]

    async def _group(col):
        res = await db.execute(select(col, func.count()).group_by(col))
        return [{"key": getattr(k, "value", k), "count": int(c)} for k, c in res.all()]

    return APIResponse(data={
        "requestsByDay": requests_by_day,
        "listingsByStatus": await _group(Listing.status),
        "requestsByStatus": await _group(RentalRequest.status),
        "usersByRole": await _group(User.role),
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


@router.get("/users/{user_id}", response_model=APIResponse[UserResponse])
async def get_user(
    user_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    ur = UserResponse.model_validate(user)
    ur.listing_count = len(user.listings) if user.listings else 0
    return APIResponse(data=ur)


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
    await NotificationService(db).create(
        user_id=listing.owner_id,
        title="Listing Approved",
        message=f"Your listing '{listing.title}' has been approved and is now published.",
        type="listing_approved",
        reference_id=listing.id,
        reference_type="listing",
        data={"listing_id": listing.id, "listing_title": listing.title},
    )
    return APIResponse(message="Listing approved")


@router.put("/listings/{listing_id}/reject")
async def reject_listing(
    listing_id: int,
    reason: str | None = Query(None, max_length=500),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = ListingRepository(db)
    listing = await repo.get_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    await repo.update(listing, is_verified=False, status=ListingStatus.PAUSED)
    await NotificationService(db).create(
        user_id=listing.owner_id,
        title="Listing Rejected",
        message=f"Your listing '{listing.title}' was rejected by the moderator.",
        type="listing_rejected",
        reference_id=listing.id,
        reference_type="listing",
        data={"listing_id": listing.id, "listing_title": listing.title, "reason": reason},
    )
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
    await NotificationService(db).create(
        user_id=listing.owner_id,
        title="Listing Deactivated",
        message=f"Your listing '{listing.title}' was removed by the administration.",
        type="listing_deactivated",
        reference_id=None,
        reference_type="listing",
        data={
            "listing_id": listing.id,
            "listing_title": listing.title,
            "reason": "removed_by_admin",
        },
    )
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


def _check_url(key: str | None) -> str | None:
    """A fresh link to an attached receipt, or None when there is none.

    The row stores the storage key — permanent — and this is the only place
    it becomes a URL, expiring like every other image link the platform hands
    out. A presign that fails falls back to no link rather than to the raw
    key: the operator loses the picture, never the storage path.
    """
    if not key:
        return None
    try:
        return get_presigned_url(key, expires_in=86400)
    except Exception:
        return None


def _settled_via(raw_response: str | None) -> str | None:
    """Who stamped a top-up PAID: the provider's callback, or an operator's hand.

    ``settle`` writes the caller's own marker into ``raw_response`` — the webhook
    passes the provider payload through untouched, while the manual
    confirm-from-statement path stamps ``{"by": admin_id, "via": "admin_promo"}``.
    So the answer is read back out of that record rather than inferred from
    status alone: "PAID" says the money is in, this says who vouched for it,
    which is the difference between an automated settlement and one an
    operator is personally accountable for.

    Anything else — a payload with no ``via`` marker — is the provider's own
    callback, so it reports as ``webhook``. A row that is still waiting has
    ``raw_response`` unset and reports ``None``, never a guess.
    """
    if not raw_response:
        return None
    try:
        parsed = json.loads(raw_response)
    except ValueError:
        return "webhook"
    if isinstance(parsed, dict) and parsed.get("via"):
        return "admin"
    return "webhook"


@router.get("/topups", response_model=AdminTopupListResponse)
async def admin_list_topups(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: str | None = Query(None, alias="status"),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Every top-up across all users — who paid, how much, and when.

    The waiting room (``topup_intents``) already records ``user_id`` and the
    unique ``reference`` on each attempt; this simply joins the person on so
    the admin can see *who* transferred money. Filterable by status, newest
    first.

    Two things this deliberately does *not* do:

    * It does not treat ``amount`` as money that arrived. That column is what
      we asked for in the checkout link; a row still PENDING is a request, not
      a receipt. ``settled_via`` and ``raw_response`` carry the proof instead,
      so the list cannot be read as revenue when it is only intent.
    * It does not total only the page in view. The sums come from the whole
      table, so a 50-row page can never quietly understate what was paid.
    """
    conditions = [TopupIntent.status == status_filter] if status_filter else []

    total = (
        await db.execute(
            select(func.count()).select_from(TopupIntent).where(*conditions)
        )
    ).scalar_one()

    # Money sums are computed over every intent, ignoring both the status
    # filter and the page window — a page is a view, the totals are the fact.
    sums = (
        await db.execute(
            select(
                TopupIntent.status,
                func.count(TopupIntent.id),
                func.coalesce(func.sum(TopupIntent.amount), 0.0),
            ).group_by(TopupIntent.status)
        )
    ).all()
    totals_by_status = {status: (count, float(amount)) for status, count, amount in sums}

    rows = (
        await db.execute(
            select(TopupIntent, User)
            .join(User, TopupIntent.user_id == User.id)
            .where(*conditions)
            .order_by(TopupIntent.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
    ).all()

    items = [
        AdminTopupResponse(
            id=t.id,
            user_id=t.user_id,
            user_name=(u.display_name or u.email),
            user_email=u.email,
            amount=float(t.amount),
            reference=t.reference,
            status=t.status,
            provider=t.provider,
            created_at=t.created_at,
            paid_at=t.paid_at,
            settled_via=_settled_via(t.raw_response),
            raw_response=t.raw_response,
            check_image_url=_check_url(t.__dict__.get("check_image_key")),
            promotion_id=t.promotion_id,
            payment_id=t.payment_id,
        )
        for t, u in rows
    ]

    paid_count, paid_total = totals_by_status.get("PAID", (0, 0.0))
    pending_count, pending_total = totals_by_status.get("PENDING", (0, 0.0))
    failed_count, failed_total = totals_by_status.get("FAILED", (0, 0.0))

    return AdminTopupListResponse(
        data=items,
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
        paid_total=round(paid_total, 2),
        paid_count=paid_count,
        pending_total=round(pending_total, 2),
        pending_count=pending_count,
        failed_total=round(failed_total, 2),
        failed_count=failed_count,
    )


async def _get_post_or_404(db: AsyncSession, post_id: int) -> Post:
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.get("/posts", response_model=APIResponse[list[PostResponse]])
async def admin_list_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status_filter: str | None = Query(None, alias="status"),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Post).order_by(Post.created_at.desc())
    if status_filter:
        try:
            query = query.where(Post.status == PostStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid post status")
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    posts = result.scalars().all()
    from app.api.routes.posts import _post_to_response
    return APIResponse(data=[_post_to_response(p) for p in posts])


@router.put("/posts/{post_id}/approve", response_model=APIResponse[PostResponse])
async def admin_approve_post(
    post_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    post = await _get_post_or_404(db, post_id)
    post.status = PostStatus.APPROVED
    await db.flush()
    await db.refresh(post)
    from app.api.routes.posts import _post_to_response
    return APIResponse(message="Post approved", data=_post_to_response(post))


@router.put("/posts/{post_id}/reject", response_model=APIResponse[PostResponse])
async def admin_reject_post(
    post_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    post = await _get_post_or_404(db, post_id)
    post.status = PostStatus.REJECTED
    await db.flush()
    await db.refresh(post)
    from app.api.routes.posts import _post_to_response
    return APIResponse(message="Post rejected", data=_post_to_response(post))


@router.delete("/posts/{post_id}")
async def admin_delete_post(
    post_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    post = await _get_post_or_404(db, post_id)

    if post.image_url:
        try:
            from app.utils.s3 import delete_file
            delete_file(post.image_url)
        except Exception:
            pass

    from app.models.comment import Comment
    from app.models.like import Like
    for comment in (await db.execute(select(Comment).where(Comment.post_id == post_id))).scalars().all():
        await db.delete(comment)
    for like in (await db.execute(select(Like).where(Like.post_id == post_id))).scalars().all():
        await db.delete(like)

    await db.delete(post)
    return APIResponse(message="Post deleted")

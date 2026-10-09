"""TOP promotion - purchase, approval, activation and expiry, all server-side.

Rules the code enforces (the browser never gets a say):

* the price comes from the ``TopPlan`` row an admin configured, never from
  the request body;
* only the listing's owner (or an admin) may promote it, and only while the
  listing is ACTIVE;
* at most one open (PENDING/ACTIVE) promotion per listing - checked here
  *and* by a partial unique index, so a double click cannot double-charge;
* a promotion becomes ACTIVE only after the wallet charge succeeded or an
  admin approved it - clicking the button alone creates PENDING/UNPAID;
* the window runs from the actual activation moment (``add_duration``), and
  expiry is a server-side query on ``expires_at`` - a background loop flips
  ACTIVE rows to EXPIRED whether or not anyone ever opens the homepage.
  Read paths *also* filter ``expires_at > now``, so a promotion that has run
  out can never be shown even in the second before the loop notices.

All datetimes are naive UTC, the convention the whole backend uses.
"""

import calendar
import logging
from datetime import date, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.enums import (
    ListingStatus,
    TopPromotionPayment,
    TopPromotionStatus,
    UserRole,
)
from app.models.listing import Listing
from app.models.promotion import TOP_DURATION_KEYS, TopPlan, TopPromotion
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.promotion import TopPromotionResponse
from app.services.notification import NotificationService
from app.services import topup as topup_service
from app.services.wallet import WalletService, money

logger = logging.getLogger("rentflow.top_promotions")

OPEN_STATUSES = (TopPromotionStatus.PENDING, TopPromotionStatus.ACTIVE)

# English, like every other backend-authored notification in the project.
_DURATION_LABELS = {
    "3h": "3 hours",
    "1d": "1 day",
    "1w": "1 week",
    "1m": "1 month",
}


def duration_label(duration_key: str) -> str:
    return _DURATION_LABELS.get(duration_key, duration_key)


def add_duration(now: datetime, duration_key: str) -> datetime:
    """Activation moment + the plan's window.

    ``1m`` is a *calendar* month: 31 Jan + 1 month = 28/29 Feb, never
    "31 days later". Everything else is exact (3h / 24h / 7 days).
    """
    if duration_key == "3h":
        return now + timedelta(hours=3)
    if duration_key == "1d":
        return now + timedelta(days=1)
    if duration_key == "1w":
        return now + timedelta(days=7)
    if duration_key == "1m":
        month = now.month + 1
        year = now.year
        if month > 12:
            month -= 12
            year += 1
        day = min(now.day, calendar.monthrange(year, month)[1])
        return now.replace(year=year, month=month, day=day)
    raise HTTPException(status_code=400, detail="INVALID_DURATION")


# --------------------------------------------------------------- responses
def to_response(promo: TopPromotion) -> TopPromotionResponse:
    # Read the already-pinned relationships straight out of __dict__: this is
    # a *sync* function, so any lazy load here would be an async-context crash
    # (MissingGreenlet). The service functions pin listing/user/plan before
    # returning; __dict__.get never triggers a query.
    listing = promo.__dict__.get("listing")
    user = promo.__dict__.get("user")
    user_name = None
    if user:
        user_name = user.display_name or (user.email or "").split("@")[0] or None
    return TopPromotionResponse(
        id=promo.id,
        listing_id=promo.listing_id,
        listing_title=listing.title if listing else None,
        user_id=promo.user_id,
        user_name=user_name,
        plan_id=promo.plan_id,
        plan_name=promo.plan_name,
        duration_key=promo.duration_key,
        price=float(promo.price),
        status=promo.status,
        payment_status=promo.payment_status,
        started_at=promo.started_at,
        expires_at=promo.expires_at,
        reject_reason=promo.reject_reason,
        created_at=promo.created_at,
    )


# ------------------------------------------------------------ notifications
async def _notify(
    db: AsyncSession,
    *,
    user_id: int,
    ntype: str,
    title: str,
    message: str,
    promo: TopPromotion,
    extra: dict | None = None,
) -> None:
    """One in-app notification, logged and swallowed on failure so a broken
    websocket can never roll back the promotion itself (spec: log failures,
    keep an observable status)."""
    try:
        # __dict__ access only - never a lazy load from inside a handler.
        listing = promo.__dict__.get("listing")
        data = {
            "promotion_id": promo.id,
            "listing_id": promo.listing_id,
            "listing_title": listing.title if listing else None,
            "listing_url": f"/listing/{promo.listing_id}",
            "plan_name": promo.plan_name,
            "duration_key": promo.duration_key,
            "duration": duration_label(promo.duration_key),
            "price": float(promo.price),
            "status": str(promo.status.value if hasattr(promo.status, "value") else promo.status),
            "payment_status": str(
                promo.payment_status.value
                if hasattr(promo.payment_status, "value")
                else promo.payment_status
            ),
            "expires_at": promo.expires_at.isoformat() if promo.expires_at else None,
            "requested_at": promo.created_at.isoformat(),
        }
        if extra:
            data.update(extra)
        await NotificationService(db).create(
            user_id=user_id,
            title=title,
            message=message,
            type=ntype,
            reference_id=promo.id,
            reference_type="top_promotion",
            data=data,
        )
    except Exception:
        logger.exception(
            "TOP notification failed (user=%s type=%s promotion=%s)",
            user_id,
            ntype,
            promo.id,
        )


async def _notify_admins(
    db: AsyncSession, *, ntype: str, title: str, message: str, promo: TopPromotion,
    extra: dict | None = None,
) -> int:
    try:
        admins = await UserRepository(db).get_by_role(UserRole.ADMIN)
    except Exception:
        logger.exception("Could not load admins for TOP notification")
        return 0
    sent = 0
    for admin in admins:
        await _notify(
            db,
            user_id=admin.id,
            ntype=ntype,
            title=title,
            message=message,
            promo=promo,
            extra=extra,
        )
        sent += 1
    return sent


# -------------------------------------------------------------------- plans
async def get_public_plans(db: AsyncSession) -> list[TopPlan]:
    result = await db.execute(
        select(TopPlan).where(TopPlan.is_active.is_(True)).order_by(TopPlan.id)
    )
    return list(result.scalars().all())


async def get_all_plans(db: AsyncSession) -> list[TopPlan]:
    result = await db.execute(select(TopPlan).order_by(TopPlan.id))
    return list(result.scalars().all())


async def create_plan(
    db: AsyncSession, *, name: str, duration_key: str, price: float, is_active: bool
) -> TopPlan:
    if duration_key not in TOP_DURATION_KEYS:
        raise HTTPException(status_code=400, detail="INVALID_DURATION")
    plan = TopPlan(
        name=name.strip(),
        duration_key=duration_key,
        price=money(price),
        is_active=bool(is_active),
    )
    db.add(plan)
    await db.flush()
    return plan


async def update_plan(db: AsyncSession, plan_id: int, data) -> TopPlan:
    plan = await db.get(TopPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    payload = data.model_dump(exclude_unset=True)
    if "duration_key" in payload and payload["duration_key"] not in TOP_DURATION_KEYS:
        raise HTTPException(status_code=400, detail="INVALID_DURATION")
    if "name" in payload:
        plan.name = payload["name"].strip()
    if "duration_key" in payload:
        plan.duration_key = payload["duration_key"]
    if "price" in payload:
        plan.price = money(payload["price"])
    if "is_active" in payload:
        plan.is_active = bool(payload["is_active"])
    await db.flush()
    return plan


# ------------------------------------------------------------ create / buy
async def create_promotion(
    db: AsyncSession,
    *,
    user_id: int,
    is_admin: bool,
    listing_id: int,
    plan_id: int,
) -> TopPromotion:
    listing = await db.get(Listing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.owner_id != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Not your listing")
    if listing.status != ListingStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="LISTING_NOT_ACTIVE")

    plan = await db.get(TopPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if not plan.is_active:
        raise HTTPException(status_code=400, detail="PLAN_DISABLED")

    existing = await db.execute(
        select(TopPromotion.id).where(
            TopPromotion.listing_id == listing_id,
            TopPromotion.status.in_(OPEN_STATUSES),
        )
    )
    if existing.first() is not None:
        raise HTTPException(status_code=409, detail="PROMOTION_EXISTS")

    now = datetime.utcnow()
    price = money(plan.price)
    status = TopPromotionStatus.PENDING
    payment = TopPromotionPayment.UNPAID
    started_at: datetime | None = None
    expires_at: datetime | None = None

    # Activation requires a *successful* server-side payment (or a price the
    # admin set to 0). Anything else stays PENDING for admin approval.
    can_charge = price == 0 or (
        get_settings().WALLET_ENABLED
        and await WalletService(db).can_afford(user_id, price)
    )
    if can_charge:
        charged = True
        if price > 0:
            try:
                await WalletService(db).spend(
                    user_id,
                    price,
                    description=f"TOP promotion: {listing.title} ({duration_label(plan.duration_key)})",
                )
            except HTTPException as exc:
                if exc.detail == "INSUFFICIENT_BALANCE":
                    # Lost a race for the balance between check and spend -
                    # fall through to the approval workflow, no money moved.
                    charged = False
                else:
                    raise
        if charged:
            status = TopPromotionStatus.ACTIVE
            payment = TopPromotionPayment.PAID
            started_at = now
            expires_at = add_duration(now, plan.duration_key)

    promo = TopPromotion(
        listing_id=listing.id,
        user_id=listing.owner_id,
        plan_id=plan.id,
        plan_name=plan.name,
        duration_key=plan.duration_key,
        price=price,
        status=status,
        payment_status=payment,
        started_at=started_at,
        expires_at=expires_at,
    )
    db.add(promo)
    try:
        # The partial unique index fires here if an open promotion slipped in
        # concurrently - the rollback below also un-does the wallet charge.
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="PROMOTION_EXISTS")

    # Pin the related rows on the instance *before* the locals of this
    # function go out of scope: SQLAlchemy's identity map holds weak
    # references, so once `listing`/`plan` are only reachable from a dead
    # frame they can be collected - and the route's sync to_response would
    # then find nothing loaded and try to query (async crash). Assignment
    # only re-states relationships that already match the columns, so the
    # final flush writes nothing extra.
    promo.listing = listing
    promo.plan = plan
    promo.user = listing.owner

    if status == TopPromotionStatus.ACTIVE:
        await _notify(
            db,
            user_id=promo.user_id,
            ntype="top_activated",
            title="TOP promotion active",
            message=(
                f'Your listing "{listing.title}" is now TOP '
                f"until {expires_at:%Y-%m-%d %H:%M} UTC."
            ),
            promo=promo,
        )
    else:
        owner = listing.owner
        user_name = None
        if owner:
            user_name = owner.display_name or (owner.email or "").split("@")[0]
        await _notify_admins(
            db,
            ntype="top_request",
            title="New TOP promotion request",
            message=(
                f"New TOP promotion request: '{listing.title}'. "
                f"Plan: {plan.name} ({duration_label(plan.duration_key)}). "
                f"Price: {price} TJS. Requested: {promo.created_at:%Y-%m-%d %H:%M} UTC. "
                "Status: Pending admin approval."
            ),
            promo=promo,
            extra={"user_name": user_name, "owner_id": listing.owner_id},
        )

    await db.flush()
    return promo


async def create_dc_payment(
    db: AsyncSession,
    *,
    user_id: int,
    is_admin: bool,
    listing_id: int,
    plan_id: int,
) -> tuple[TopPromotion, dict]:
    """Open a DC Wallet (Dushanbe City) checkout for a TOP promotion.

    Same guards as :func:`create_promotion` - owner/admin, ACTIVE listing,
    enabled plan, at most one open request - but no wallet charge: the money
    arrives through the provider, and the webhook (or an operator confirming
    the reference) is what flips this record to PAID + ACTIVE. The price,
    like everywhere else, comes from the plan row.

    A promotion that is already waiting (PENDING + UNPAID, same plan) is
    *reused* rather than refused: the checkout link for it is handed out
    again, so abandoning the payment page and coming back cannot dead-end
    the listing behind a 409 the user cannot act on.
    """
    if not get_settings().PAYDC_ENABLED:
        raise HTTPException(status_code=400, detail="TOPUP_DISABLED")

    listing = await db.get(Listing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.owner_id != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Not your listing")
    if listing.status != ListingStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="LISTING_NOT_ACTIVE")

    plan = await db.get(TopPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if not plan.is_active:
        raise HTTPException(status_code=400, detail="PLAN_DISABLED")

    existing = await db.execute(
        select(TopPromotion).where(
            TopPromotion.listing_id == listing_id,
            TopPromotion.status.in_(OPEN_STATUSES),
        )
    )
    promo = existing.scalars().first()
    created = False
    if promo is not None:
        if (
            promo.status != TopPromotionStatus.PENDING
            or promo.payment_status != TopPromotionPayment.UNPAID
            or promo.plan_id != plan.id
        ):
            # a live window or an approved/paid request: nothing to sell here
            raise HTTPException(status_code=409, detail="PROMOTION_EXISTS")
    else:
        price = money(plan.price)
        if price <= 0:
            # an admin's free plan activates on the spot through the normal
            # path - a checkout for 0 would have nothing to pay
            raise HTTPException(status_code=400, detail="FREE_PLAN")
        promo = TopPromotion(
            listing_id=listing.id,
            user_id=listing.owner_id,
            plan_id=plan.id,
            plan_name=plan.name,
            duration_key=plan.duration_key,
            price=price,
            status=TopPromotionStatus.PENDING,
            payment_status=TopPromotionPayment.UNPAID,
        )
        db.add(promo)
        try:
            await db.flush()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=409, detail="PROMOTION_EXISTS")
        created = True

    price = money(promo.price)
    if price <= 0:
        raise HTTPException(status_code=400, detail="FREE_PLAN")

    # Pin the related rows on the instance before the locals of this function
    # go out of scope (same identity-map/weakref rule as create_promotion):
    # to_response and the notifications read them out of __dict__ only.
    promo.listing = listing
    promo.plan = plan
    owner = listing.owner
    promo.user = owner

    # One checkout per pending promotion: a repeat click reopens the very
    # same link instead of stacking second waiting rows behind it.
    intent = await topup_service.pending_promotion_intent(db, promo.id)
    if intent is not None:
        reference = intent.reference
        url = topup_service.payment_url(
            user_id, float(intent.amount), intent.reference
        )
    else:
        opened = await topup_service.open_promotion_intent(
            db, user_id=user_id, promotion_id=promo.id, amount=price
        )
        reference = opened["reference"]
        url = opened["url"]

    if created:
        # "to the admin as well": the request lands in Admin -> TOP as a row
        # and as a notification carrying the very price that went to DC City.
        user_name = None
        if owner:
            user_name = owner.display_name or (owner.email or "").split("@")[0]
        await _notify_admins(
            db,
            ntype="top_request",
            title="TOP promotion via DC Wallet",
            message=(
                f"TOP payment opened via DC Wallet (Dushanbe City): "
                f"'{listing.title}'. "
                f"Plan: {plan.name} ({duration_label(plan.duration_key)}). "
                f"Price: {price} TJS. Reference: {reference}. "
                "Status: waiting for the payment to be confirmed."
            ),
            promo=promo,
            extra={"user_name": user_name, "owner_id": listing.owner_id},
        )

    await db.flush()
    return promo, {"url": url, "reference": reference}


async def complete_dc_payment(
    db: AsyncSession,
    *,
    promo_id: int,
) -> str:
    """A DC Wallet payment for this promotion has actually landed.

    Called from :func:`app.services.topup.settle` - the webhook, or an
    operator confirming the reference - which has already checked the
    reference, the amount and that this intent was not settled before.
    Idempotent on its own too: a promotion that is already PAID is reported,
    never re-activated, so a window keeps the start it was given.

    Returns ``PROMOTION_ACTIVATED`` (pending window now live),
    ``PROMOTION_PAID`` (activated by hand earlier, now settled),
    ``PROMOTION_CLOSED`` (rejected/expired/cancelled mid-flight: no window,
    the money stays on the intent for an operator to settle out of band) or
    ``UNKNOWN_PROMOTION``.
    """
    promo = await db.get(TopPromotion, promo_id)
    if promo is None:
        return "UNKNOWN_PROMOTION"
    if promo.payment_status == TopPromotionPayment.PAID:
        return "ALREADY_PAID"

    now = datetime.utcnow()
    if promo.status == TopPromotionStatus.PENDING:
        promo.status = TopPromotionStatus.ACTIVE
        promo.payment_status = TopPromotionPayment.PAID
        promo.started_at = now
        promo.expires_at = add_duration(now, promo.duration_key)
        result = "PROMOTION_ACTIVATED"
    elif promo.status == TopPromotionStatus.ACTIVE:
        promo.payment_status = TopPromotionPayment.PAID
        result = "PROMOTION_PAID"
    else:
        return "PROMOTION_CLOSED"

    # Pin for the notification and any response built after us, while the
    # caller's frame is still alive (see create_promotion).
    listing = (
        await db.execute(select(Listing).where(Listing.id == promo.listing_id))
    ).scalar_one_or_none()
    promo.listing = listing
    plan = await db.get(TopPlan, promo.plan_id)
    promo.plan = plan
    owner = listing.owner if listing else None
    promo.user = owner

    if result == "PROMOTION_ACTIVATED":
        await _notify(
            db,
            user_id=promo.user_id,
            ntype="top_activated",
            title="TOP promotion active",
            message=(
                f"Payment received (DC Wallet / Dushanbe City): your listing "
                f'"{listing.title if listing else promo.listing_id}" is now TOP '
                f"until {promo.expires_at:%Y-%m-%d %H:%M} UTC."
            ),
            promo=promo,
        )
    await db.flush()
    return result


# ------------------------------------------------------------- admin actions
async def _get_promotion(db: AsyncSession, promo_id: int) -> TopPromotion:
    promo = await db.get(TopPromotion, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")
    # Pin relations the way create_promotion does: `db.get` may hand back an
    # instance whose lazy attributes were never loaded (it skips its eager
    # loaders when the row is already in the identity map), and everything
    # downstream - notifications, responses - reads them synchronously.
    if "listing" not in promo.__dict__:
        listing = await db.get(Listing, promo.listing_id)
        if listing is not None:
            promo.listing = listing
    if "user" not in promo.__dict__:
        user = await db.get(User, promo.user_id)
        if user is not None:
            promo.user = user
    if "plan" not in promo.__dict__:
        plan = await db.get(TopPlan, promo.plan_id)
        if plan is not None:
            promo.plan = plan
    return promo


async def approve(db: AsyncSession, promo_id: int) -> TopPromotion:
    promo = await _get_promotion(db, promo_id)
    if promo.status != TopPromotionStatus.PENDING:
        raise HTTPException(status_code=400, detail="NOT_PENDING")
    listing = promo.__dict__.get("listing")
    if listing is None or listing.status != ListingStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="LISTING_NOT_ELIGIBLE")

    # The window runs from the actual activation time - approving a request
    # on Monday buys a full window from Monday, not from when it was asked.
    now = datetime.utcnow()
    promo.status = TopPromotionStatus.ACTIVE
    if promo.payment_status == TopPromotionPayment.UNPAID:
        promo.payment_status = TopPromotionPayment.APPROVED
    promo.started_at = now
    promo.expires_at = add_duration(now, promo.duration_key)
    promo.reject_reason = None
    await db.flush()

    await _notify(
        db,
        user_id=promo.user_id,
        ntype="top_approved",
        title="TOP promotion approved",
        message=(
            f'Your TOP request for "{listing.title}" was approved. '
            f"It is TOP until {promo.expires_at:%Y-%m-%d %H:%M} UTC."
        ),
        promo=promo,
    )
    await db.flush()
    return promo


async def reject(db: AsyncSession, promo_id: int, reason: str | None) -> TopPromotion:
    promo = await _get_promotion(db, promo_id)
    if promo.status != TopPromotionStatus.PENDING:
        raise HTTPException(status_code=400, detail="NOT_PENDING")
    promo.status = TopPromotionStatus.REJECTED
    promo.reject_reason = (reason or "").strip() or "Rejected by admin"
    await db.flush()

    listing = promo.__dict__.get("listing")
    await _notify(
        db,
        user_id=promo.user_id,
        ntype="top_rejected",
        title="TOP promotion request rejected",
        message=(
            f'Your TOP request for "{listing.title if listing else promo.listing_id}" '
            f'was rejected. Reason: {promo.reject_reason}'
        ),
        promo=promo,
        extra={"reason": promo.reject_reason},
    )
    await db.flush()
    return promo


async def cancel(db: AsyncSession, promo_id: int) -> TopPromotion:
    """Manual deactivation. A wallet-charged promotion is refunded once -
    the status change makes a second cancel impossible, so the refund cannot
    repeat either."""
    promo = await _get_promotion(db, promo_id)
    if promo.status != TopPromotionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="NOT_ACTIVE")
    promo.status = TopPromotionStatus.CANCELLED
    if promo.payment_status == TopPromotionPayment.PAID:
        await WalletService(db).topup(
            promo.user_id,
            float(promo.price),
            description=f"Refund: TOP promotion #{promo.id} deactivated by admin",
        )
        promo.payment_status = TopPromotionPayment.REFUNDED
    await db.flush()

    listing = promo.__dict__.get("listing")
    await _notify(
        db,
        user_id=promo.user_id,
        ntype="top_cancelled",
        title="TOP promotion deactivated",
        message=(
            f'The TOP status of "{listing.title if listing else promo.listing_id}" '
            "was deactivated by an administrator."
        ),
        promo=promo,
    )
    await db.flush()
    return promo


async def activate(db: AsyncSession, promo_id: int) -> TopPromotion:
    """Manual (re)activation: PENDING / REJECTED / CANCELLED / EXPIRED ->
    ACTIVE with a fresh window from now. Never allowed while another open
    promotion exists for the same listing."""
    promo = await _get_promotion(db, promo_id)
    if promo.status == TopPromotionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="ALREADY_ACTIVE")
    listing = promo.__dict__.get("listing")
    if listing is None or listing.status != ListingStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="LISTING_NOT_ELIGIBLE")

    clash = await db.execute(
        select(TopPromotion.id).where(
            TopPromotion.listing_id == promo.listing_id,
            TopPromotion.status.in_(OPEN_STATUSES),
            TopPromotion.id != promo.id,
        )
    )
    if clash.first() is not None:
        raise HTTPException(status_code=409, detail="PROMOTION_EXISTS")

    now = datetime.utcnow()
    promo.status = TopPromotionStatus.ACTIVE
    if promo.payment_status == TopPromotionPayment.UNPAID:
        promo.payment_status = TopPromotionPayment.APPROVED
    promo.started_at = now
    promo.expires_at = add_duration(now, promo.duration_key)
    promo.reject_reason = None
    await db.flush()

    await _notify(
        db,
        user_id=promo.user_id,
        ntype="top_activated",
        title="TOP promotion active",
        message=(
            f'Your listing "{listing.title}" was made TOP by an administrator '
            f"until {promo.expires_at:%Y-%m-%d %H:%M} UTC."
        ),
        promo=promo,
    )
    await db.flush()
    return promo


# ------------------------------------------------------------------- expiry
async def expire_due(db: AsyncSession) -> int:
    """Flip every window whose ``expires_at`` has passed to EXPIRED.

    One UPDATE - no listing is touched, no money moves, the row stays as
    history. Called by the background loop and safe to run repeatedly.
    """
    now = datetime.utcnow()
    result = await db.execute(
        update(TopPromotion)
        .where(
            TopPromotion.status == TopPromotionStatus.ACTIVE,
            TopPromotion.expires_at.is_not(None),
            TopPromotion.expires_at <= now,
        )
        .values(status=TopPromotionStatus.EXPIRED)
        .execution_options(synchronize_session=False)
    )
    count = int(result.rowcount or 0)
    if count:
        await db.commit()
        logger.info("Expired %d TOP promotion(s)", count)
    return count


async def get_active_top_ids(
    db: AsyncSession, listing_ids: list[int] | None = None
) -> set[int]:
    """Listing ids whose TOP window is live *right now*.

    The ``expires_at > now`` half is the query rule that keeps a badge from
    ever outliving its payment, even if the expiry loop has not run yet.
    """
    now = datetime.utcnow()
    stmt = select(TopPromotion.listing_id).where(
        TopPromotion.status == TopPromotionStatus.ACTIVE,
        TopPromotion.expires_at.is_not(None),
        TopPromotion.expires_at > now,
    )
    if listing_ids:
        stmt = stmt.where(TopPromotion.listing_id.in_(listing_ids))
    rows = (await db.execute(stmt)).all()
    return {int(row[0]) for row in rows}


async def top_listings(db: AsyncSession, limit: int = 12) -> list[Listing]:
    """The homepage TOP section: live windows only, no expired rows, no
    duplicates (the unique index guarantees one open promotion per listing)."""
    now = datetime.utcnow()
    result = await db.execute(
        select(Listing)
        .join(TopPromotion, TopPromotion.listing_id == Listing.id)
        .where(
            TopPromotion.status == TopPromotionStatus.ACTIVE,
            TopPromotion.expires_at.is_not(None),
            TopPromotion.expires_at > now,
            Listing.status == ListingStatus.ACTIVE,
            Listing.available.is_(True),
        )
        .order_by(TopPromotion.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def my_promotions(db: AsyncSession, user_id: int) -> list[TopPromotion]:
    result = await db.execute(
        select(TopPromotion)
        .where(TopPromotion.user_id == user_id)
        .order_by(TopPromotion.created_at.desc())
        .limit(100)
    )
    return list(result.scalars().all())


# ------------------------------------------------------------------- admin
async def admin_list(
    db: AsyncSession,
    *,
    status: str | None = None,
    listing_id: int | None = None,
    user_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[TopPromotion], int]:
    stmt = select(TopPromotion)
    if status:
        try:
            status_enum = TopPromotionStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid promotion status")
        stmt = stmt.where(TopPromotion.status == status_enum)
    if listing_id is not None:
        stmt = stmt.where(TopPromotion.listing_id == listing_id)
    if user_id is not None:
        stmt = stmt.where(TopPromotion.user_id == user_id)
    if date_from is not None:
        stmt = stmt.where(TopPromotion.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to is not None:
        stmt = stmt.where(TopPromotion.created_at < datetime.combine(date_to + timedelta(days=1), datetime.min.time()))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = int((await db.execute(count_stmt)).scalar() or 0)

    result = await db.execute(
        stmt.order_by(TopPromotion.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all()), total


async def admin_stats(db: AsyncSession) -> dict:
    rows = (
        await db.execute(
            select(TopPromotion.status, func.count()).group_by(TopPromotion.status)
        )
    ).all()
    counts = {str(status.value): int(cnt) for status, cnt in rows}

    # Only money that actually left a wallet (PAID), never a projection.
    revenue = (
        await db.execute(
            select(func.coalesce(func.sum(TopPromotion.price), 0)).where(
                TopPromotion.payment_status == TopPromotionPayment.PAID
            )
        )
    ).scalar() or 0

    return {
        "total": sum(counts.values()),
        "active": counts.get("ACTIVE", 0),
        "pending": counts.get("PENDING", 0),
        "expired": counts.get("EXPIRED", 0),
        "rejected": counts.get("REJECTED", 0),
        "cancelled": counts.get("CANCELLED", 0),
        "revenue": float(revenue),
    }

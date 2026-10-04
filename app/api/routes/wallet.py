from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import require_admin, require_auth, CurrentUser
from app.schemas.base import APIResponse, PaginatedResponse
from app.schemas.wallet import (
    TopupIntentResponse,
    TopupPrepareRequest,
    TopupPrepareResponse,
    WalletSummary,
    WalletTopUpRequest,
    WalletTransactionResponse,
)
from app.services import topup as topup_service
from app.services.wallet import WalletService
from app.models.rental_request import RentalRequest

router = APIRouter(prefix="/wallet", tags=["Wallet"])


def _summary(payload: dict) -> WalletSummary:
    return WalletSummary(**payload)


async def _with_listing_titles(db: AsyncSession, items) -> dict[int, str]:
    """One query for the listings the page's transactions belong to, so the
    history reads like a sentence instead of a set of ids."""
    request_ids = sorted({tx.rental_request_id for tx in items if tx.rental_request_id})
    if not request_ids:
        return {}
    result = await db.execute(
        select(RentalRequest).where(RentalRequest.id.in_(request_ids))
    )
    titles: dict[int, str] = {}
    for req in result.scalars().all():
        title = req.listing.title if req.listing else None
        titles[req.id] = title or ""
    return titles


@router.get("", response_model=APIResponse[WalletSummary])
async def get_wallet(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Available vs reserved for the signed-in user."""
    service = WalletService(db)
    return APIResponse(data=_summary(await service.summary(current_user.user_id)))


@router.get("/transactions", response_model=PaginatedResponse[WalletTransactionResponse])
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """The ledger: every hold, release, refund, completion and top-up."""
    service = WalletService(db)
    skip = (page - 1) * page_size
    items, total = await service.transactions(current_user.user_id, skip, page_size)
    titles = await _with_listing_titles(db, items)

    data = []
    for tx in items:
        row = WalletTransactionResponse.model_validate(tx)
        row.listing_title = titles.get(tx.rental_request_id) or None
        data.append(row)
    return PaginatedResponse(data=data, total=total, page=page, page_size=page_size)


@router.post("/topup", response_model=APIResponse[WalletSummary])
async def top_up_balance(
    payload: WalletTopUpRequest,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Hand a user money by hand — an admin action.

    A logged-in user must never be able to post their own balance into
    existence now that there is a real payment path: the browser asks for a
    link via ``/topup/prepare`` and the webhook is what credits the ledger.
    Tests flip ``WALLET_ALLOW_MANUAL_TOPUP`` to exercise the ledger directly.
    """
    settings = get_settings()
    if not settings.WALLET_ENABLED:
        raise HTTPException(status_code=403, detail="WALLET_DISABLED")
    if not current_user.is_admin and not settings.WALLET_ALLOW_MANUAL_TOPUP:
        raise HTTPException(status_code=403, detail="TOPUP_ADMIN_ONLY")

    service = WalletService(db)
    await service.topup(current_user.user_id, payload.amount, payload.description)
    return APIResponse(
        message="Balance topped up",
        data=_summary(await service.summary(current_user.user_id)),
    )


@router.post("/topup/prepare", response_model=APIResponse[TopupPrepareResponse])
async def prepare_top_up(
    payload: TopupPrepareRequest,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Build the DC City payment link for this user and this amount.

    Nothing is credited here — only a waiting row is opened, carrying the
    reference that travels in the link's ``f3`` and comes back with the
    callback.
    """
    if not get_settings().WALLET_ENABLED:
        raise HTTPException(status_code=403, detail="WALLET_DISABLED")
    data = await topup_service.prepare(db, current_user.user_id, payload.amount)
    return APIResponse(message="Payment link created", data=TopupPrepareResponse(**data))


@router.get("/topups", response_model=PaginatedResponse[TopupIntentResponse])
async def list_top_ups(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Pending and settled top-ups, so money on its way is never invisible."""
    if not get_settings().WALLET_ENABLED:
        raise HTTPException(status_code=403, detail="WALLET_DISABLED")
    rows = await topup_service.intents(db, current_user.user_id, page_size)
    return PaginatedResponse(
        data=[TopupIntentResponse.model_validate(r) for r in rows],
        total=len(rows),
        page=page,
        page_size=page_size,
    )


@router.post("/topups/{reference}/confirm", response_model=APIResponse[TopupIntentResponse])
async def confirm_top_up(
    reference: str,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Close a top-up whose payment is already visible in the statement.

    DC City publishes no status API to ask, so until they register the
    callback this is the other way money on its way becomes money in the
    wallet: the operator finds the reference (``f3``) in the DC Wallet
    statement and confirms it here. It runs through the very same idempotent
    settle the callback uses, so a second confirmation — or the callback
    arriving later — credits nothing extra.

    Admin only: a customer must never be able to stamp their own payment as
    paid.
    """
    if not get_settings().WALLET_ENABLED:
        raise HTTPException(status_code=403, detail="WALLET_DISABLED")
    row = await topup_service.find(db, reference)
    if row is None:
        raise HTTPException(status_code=404, detail="TOPUP_NOT_FOUND")

    credited, reason = await topup_service.settle(
        db,
        reference=reference,
        amount=None,
        raw={"by": current_user.user_id, "via": "admin"},
    )
    if not credited and reason != "ALREADY_PAID":
        # the row is still PENDING, so the operator can simply try again
        raise HTTPException(status_code=400, detail=reason)

    return APIResponse(message=reason, data=TopupIntentResponse.model_validate(row))

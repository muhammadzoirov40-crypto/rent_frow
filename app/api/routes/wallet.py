from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_auth, CurrentUser
from app.schemas.base import APIResponse, PaginatedResponse
from app.schemas.wallet import WalletSummary, WalletTopUpRequest, WalletTransactionResponse
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
    """Add money to the wallet.

    There is no payment gateway on the free tier: this is an explicit manual
    credit, kept in one method so a real provider can replace it later without
    touching any other part of the flow.
    """
    service = WalletService(db)
    await service.topup(current_user.user_id, payload.amount, payload.description)
    return APIResponse(
        message="Balance topped up",
        data=_summary(await service.summary(current_user.user_id)),
    )

"""TOP promotion endpoints.

Two audiences, one file:

* ``/promotions`` - what the user side touches: the active plan list, the
  purchase/request itself (``listing_id`` + ``plan_id`` only - price, status
  and timestamps are computed server-side), and "my" promotions.
* ``/promotions/admin/...`` - everything an admin may do: plan CRUD with
  prices, the filtered history, stats, and approve / reject / cancel /
  activate. Every route here sits behind ``require_admin``; a normal user
  cannot reach any of them, and cannot change a price through the user API
  because the user schemas do not even contain a price field.
"""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import CurrentUser, require_admin, require_auth
from app.schemas.base import APIResponse, PaginatedResponse
from app.schemas.promotion import (
    TopCreateResponse,
    TopPlanCreate,
    TopPlanResponse,
    TopPlanUpdate,
    TopPromotionCreate,
    TopPromotionResponse,
    TopReject,
    TopStatsResponse,
)
from app.services import promotion as promo_service

router = APIRouter(prefix="/promotions", tags=["TOP promotions"])


# ------------------------------------------------------------------ user API
@router.get("/plans", response_model=APIResponse[list[TopPlanResponse]])
async def list_active_plans(db: AsyncSession = Depends(get_db)):
    """Public: only plans an admin switched on, so a disabled plan with a
    placeholder price is never visible (or purchasable)."""
    plans = await promo_service.get_public_plans(db)
    return APIResponse(data=plans)


@router.get("/mine", response_model=APIResponse[list[TopPromotionResponse]])
async def list_my_promotions(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    promos = await promo_service.my_promotions(db, current_user.user_id)
    return APIResponse(data=[promo_service.to_response(p) for p in promos])


@router.post("", response_model=APIResponse[TopCreateResponse])
async def request_top(
    data: TopPromotionCreate,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Buy (wallet balance) or request (admin approval) TOP for a listing.

    The body carries two ids and nothing else - no price, no status, no
    expiry. ``active`` tells the client whether the window is already live.
    """
    promo = await promo_service.create_promotion(
        db,
        user_id=current_user.user_id,
        is_admin=current_user.is_admin,
        listing_id=data.listing_id,
        plan_id=data.plan_id,
    )
    return APIResponse(
        data=TopCreateResponse(
            promotion=promo_service.to_response(promo),
            active=promo.status.value == "ACTIVE",
        )
    )


# ----------------------------------------------------------------- admin API
@router.get("/admin/plans", response_model=APIResponse[list[TopPlanResponse]])
async def admin_list_plans(
    _: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    plans = await promo_service.get_all_plans(db)
    return APIResponse(data=plans)


@router.post("/admin/plans", response_model=APIResponse[TopPlanResponse])
async def admin_create_plan(
    data: TopPlanCreate,
    _: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    plan = await promo_service.create_plan(
        db,
        name=data.name,
        duration_key=data.duration_key,
        price=data.price,
        is_active=data.is_active,
    )
    return APIResponse(message="Plan created", data=plan)


@router.put("/admin/plans/{plan_id}", response_model=APIResponse[TopPlanResponse])
async def admin_update_plan(
    plan_id: int,
    data: TopPlanUpdate,
    _: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    plan = await promo_service.update_plan(db, plan_id, data)
    return APIResponse(message="Plan updated", data=plan)


@router.get("/admin/list", response_model=PaginatedResponse[TopPromotionResponse])
async def admin_list_promotions(
    status: str = Query(None),
    listing_id: int = Query(None),
    user_id: int = Query(None),
    date_from: date = Query(None),
    date_to: date = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    promos, total = await promo_service.admin_list(
        db,
        status=status,
        listing_id=listing_id,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse(
        data=[promo_service.to_response(p) for p in promos],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/admin/stats", response_model=APIResponse[TopStatsResponse])
async def admin_top_stats(
    _: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stats = await promo_service.admin_stats(db)
    plans = await promo_service.get_all_plans(db)
    return APIResponse(
        data=TopStatsResponse(**stats, plans=plans)
    )


@router.post("/admin/{promo_id}/approve", response_model=APIResponse[TopPromotionResponse])
async def admin_approve(
    promo_id: int,
    _: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    promo = await promo_service.approve(db, promo_id)
    return APIResponse(message="Promotion approved", data=promo_service.to_response(promo))


@router.post("/admin/{promo_id}/reject", response_model=APIResponse[TopPromotionResponse])
async def admin_reject(
    promo_id: int,
    data: TopReject,
    _: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    promo = await promo_service.reject(db, promo_id, data.reason)
    return APIResponse(message="Promotion rejected", data=promo_service.to_response(promo))


@router.post("/admin/{promo_id}/cancel", response_model=APIResponse[TopPromotionResponse])
async def admin_cancel(
    promo_id: int,
    _: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Manual deactivation of a live window (PAID ones are refunded once)."""
    promo = await promo_service.cancel(db, promo_id)
    return APIResponse(message="Promotion deactivated", data=promo_service.to_response(promo))


@router.post("/admin/{promo_id}/activate", response_model=APIResponse[TopPromotionResponse])
async def admin_activate(
    promo_id: int,
    _: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Manual (re)activation with a fresh window from this moment."""
    promo = await promo_service.activate(db, promo_id)
    return APIResponse(message="Promotion activated", data=promo_service.to_response(promo))

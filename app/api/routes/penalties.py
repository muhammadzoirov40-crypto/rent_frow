from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_admin, require_customer, CurrentUser
from app.schemas.penalty import PenaltyResponse
from app.schemas.base import APIResponse
from app.services.penalty import PenaltyService
from app.core.enums import PenaltyStatus

router = APIRouter(prefix="/penalties", tags=["Penalties"])


@router.get("/me", response_model=APIResponse[list[PenaltyResponse]])
async def list_my_penalties(
    status: PenaltyStatus | None = Query(None),
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = PenaltyService(db)
    penalties = await service.get_customer_penalties(current_user.user_id, status)
    return APIResponse(data=penalties)


@router.get("/{penalty_id}", response_model=APIResponse[PenaltyResponse])
async def get_penalty(
    penalty_id: int,
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = PenaltyService(db)
    penalty = await service.get_by_id(penalty_id)
    if not current_user.is_admin and penalty.customer_id != current_user.user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied")
    return APIResponse(data=penalty)


@router.post("/admin/{penalty_id}/pay", response_model=APIResponse[PenaltyResponse])
async def pay_penalty(
    penalty_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PenaltyService(db)
    penalty = await service.pay_penalty(current_user.user_id, penalty_id)
    return APIResponse(message="Penalty paid", data=penalty)


@router.post("/admin/{penalty_id}/waive", response_model=APIResponse[PenaltyResponse])
async def waive_penalty(
    penalty_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PenaltyService(db)
    penalty = await service.waive_penalty(current_user.user_id, penalty_id)
    return APIResponse(message="Penalty waived", data=penalty)

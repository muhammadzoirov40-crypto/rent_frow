from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_admin, CurrentUser
from app.schemas.statistics import StatisticsResponse
from app.schemas.base import APIResponse
from app.services.statistics import StatisticsService

router = APIRouter(prefix="/statistics", tags=["Statistics"])


@router.get("", response_model=APIResponse[StatisticsResponse])
async def get_statistics(
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = StatisticsService(db)
    stats = await service.get_statistics()
    return APIResponse(data=stats)

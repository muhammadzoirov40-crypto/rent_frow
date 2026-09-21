from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_owner, CurrentUser
from app.schemas.dashboard import (
    DashboardSummary, RevenueChartResponse, BookingPerformance, RecentBooking,
)
from app.schemas.base import APIResponse
from app.services.dashboard import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=APIResponse[DashboardSummary])
async def get_summary(
    current_user: CurrentUser = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)
    summary = await service.get_summary(current_user.user_id)
    return APIResponse(data=summary)


@router.get("/revenue-chart", response_model=APIResponse[RevenueChartResponse])
async def get_revenue_chart(
    period: str = Query("6months", description="7days|30days|thismonth|6months|lastyear"),
    current_user: CurrentUser = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)
    chart = await service.get_revenue_chart(current_user.user_id, period)
    return APIResponse(data=chart)


@router.get("/booking-performance", response_model=APIResponse[BookingPerformance])
async def get_booking_performance(
    current_user: CurrentUser = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)
    perf = await service.get_booking_performance(current_user.user_id)
    return APIResponse(data=perf)


@router.get("/recent-bookings", response_model=APIResponse[list[RecentBooking]])
async def get_recent_bookings(
    limit: int = Query(10, ge=1, le=50),
    current_user: CurrentUser = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)
    bookings = await service.get_recent_bookings(current_user.user_id, limit)
    return APIResponse(data=bookings)

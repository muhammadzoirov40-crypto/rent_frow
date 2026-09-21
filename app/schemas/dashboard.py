from datetime import date
from pydantic import BaseModel
from typing import Optional


class DashboardSummary(BaseModel):
    total_revenue: float = 0.0
    revenue_change_pct: float = 0.0
    total_bookings: int = 0
    bookings_change_pct: float = 0.0
    active_rentals: int = 0
    active_rentals_change_pct: float = 0.0
    occupancy_rate: float = 0.0
    occupancy_change_pct: float = 0.0


class RevenueChartPoint(BaseModel):
    label: str
    revenue: float
    previous_revenue: float = 0.0


class RevenueChartResponse(BaseModel):
    total_revenue: float = 0.0
    revenue_change_pct: float = 0.0
    data: list[RevenueChartPoint] = []


class BookingPerformance(BaseModel):
    completed: int = 0
    pending: int = 0
    cancelled: int = 0
    rejected: int = 0
    confirmed: int = 0
    total: int = 0
    completion_pct: float = 0.0


class RecentBooking(BaseModel):
    id: int
    customer_name: str = "Unknown"
    equipment_name: str = "Unknown"
    start_date: date
    end_date: date
    total_price: float
    status: str
    created_at: str

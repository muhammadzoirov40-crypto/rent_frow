from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.booking import Booking
from app.models.equipment import Equipment
from app.models.rental import Rental
from app.core.enums import BookingStatus, RentalStatus
from app.schemas.dashboard import (
    DashboardSummary, RevenueChartPoint, RevenueChartResponse,
    BookingPerformance, RecentBooking,
)


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_owner_equipment_ids(self, owner_id: int) -> list[int]:
        query = select(Equipment.id).where(Equipment.owner_id == owner_id)
        result = await self.db.execute(query)
        return [row[0] for row in result.all()]

    async def _get_revenue(self, owner_id: int, start: date, end: date) -> float:
        eq_ids = await self._get_owner_equipment_ids(owner_id)
        if not eq_ids:
            return 0.0
        query = (
            select(func.coalesce(func.sum(Booking.total_price), 0))
            .join(Equipment, Booking.equipment_id == Equipment.id)
            .where(
                Equipment.owner_id == owner_id,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED]),
                Booking.start_date >= start,
                Booking.start_date < end,
            )
        )
        result = await self.db.execute(query)
        return float(result.scalar_one() or 0.0)

    async def _get_bookings_count(self, owner_id: int, start: date, end: date) -> int:
        eq_ids = await self._get_owner_equipment_ids(owner_id)
        if not eq_ids:
            return 0
        query = (
            select(func.count())
            .select_from(Booking)
            .join(Equipment, Booking.equipment_id == Equipment.id)
            .where(
                Equipment.owner_id == owner_id,
                Booking.start_date >= start,
                Booking.start_date < end,
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one() or 0

    async def _get_active_rentals_count(self, owner_id: int) -> int:
        eq_ids = await self._get_owner_equipment_ids(owner_id)
        if not eq_ids:
            return 0
        query = (
            select(func.count())
            .select_from(Rental)
            .where(
                Rental.equipment_id.in_(eq_ids),
                Rental.status.in_([
                    RentalStatus.ACTIVE,
                    RentalStatus.PICKED_UP,
                    RentalStatus.RESERVED,
                    RentalStatus.RETURN_REQUESTED,
                ]),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one() or 0

    async def _get_occupancy_rate(self, owner_id: int, today: date) -> float:
        query = select(func.count()).select_from(Equipment).where(
            Equipment.owner_id == owner_id,
            Equipment.is_active == True,
        )
        result = await self.db.execute(query)
        total_active = result.scalar_one() or 0
        if total_active == 0:
            return 0.0
        eq_ids = await self._get_owner_equipment_ids(owner_id)
        booked_query = (
            select(func.count())
            .select_from(Booking)
            .where(
                Booking.equipment_id.in_(eq_ids),
                Booking.status.in_([BookingStatus.CONFIRMED]),
                Booking.start_date <= today,
                Booking.end_date >= today,
            )
        )
        result = await self.db.execute(booked_query)
        booked = result.scalar_one() or 0
        return round((booked / total_active) * 100, 1)

    def _calc_change(self, current: float, previous: float) -> float:
        if previous == 0:
            return 0.0 if current == 0 else 100.0
        return round(((current - previous) / previous) * 100, 1)

    async def get_summary(self, owner_id: int) -> DashboardSummary:
        today = date.today()
        start_of_month = today.replace(day=1)
        start_of_prev_month = (start_of_month - timedelta(days=1)).replace(day=1)

        total_revenue = await self._get_revenue(owner_id, start_of_month, today + timedelta(days=1))
        prev_revenue = await self._get_revenue(owner_id, start_of_prev_month, start_of_month)
        total_bookings = await self._get_bookings_count(owner_id, start_of_month, today + timedelta(days=1))
        prev_bookings = await self._get_bookings_count(owner_id, start_of_prev_month, start_of_month)
        active_rentals = await self._get_active_rentals_count(owner_id)
        occupancy = await self._get_occupancy_rate(owner_id, today)

        return DashboardSummary(
            total_revenue=total_revenue,
            revenue_change_pct=self._calc_change(total_revenue, prev_revenue),
            total_bookings=total_bookings,
            bookings_change_pct=self._calc_change(total_bookings, prev_bookings),
            active_rentals=active_rentals,
            active_rentals_change_pct=0.0,
            occupancy_rate=occupancy,
            occupancy_change_pct=0.0,
        )

    async def get_revenue_chart(self, owner_id: int, period: str = "6months") -> RevenueChartResponse:
        today = date.today()
        data_points: list[RevenueChartPoint] = []

        if period == "7days":
            for i in range(6, -1, -1):
                d = today - timedelta(days=i)
                rev = await self._get_revenue(owner_id, d, d + timedelta(days=1))
                data_points.append(RevenueChartPoint(label=d.strftime("%b %d"), revenue=rev))
            total = sum(p.revenue for p in data_points)
            return RevenueChartResponse(total_revenue=total, data=data_points)

        if period == "30days":
            for i in range(29, -1, -1):
                d = today - timedelta(days=i)
                rev = await self._get_revenue(owner_id, d, d + timedelta(days=1))
                data_points.append(RevenueChartPoint(label=d.strftime("%b %d"), revenue=rev))
            total = sum(p.revenue for p in data_points)
            return RevenueChartResponse(total_revenue=total, data=data_points)

        if period == "thismonth":
            for day in range(1, today.day + 1):
                d = today.replace(day=day)
                rev = await self._get_revenue(owner_id, d, d + timedelta(days=1))
                data_points.append(RevenueChartPoint(label=str(day), revenue=rev))
            total = sum(p.revenue for p in data_points)
            return RevenueChartResponse(total_revenue=total, data=data_points)

        if period == "lastyear":
            for month in range(1, 13):
                d = today.replace(month=month, day=1)
                if month == 12:
                    end = d.replace(year=d.year + 1, month=1, day=1)
                else:
                    end = d.replace(month=month + 1, day=1)
                rev = await self._get_revenue(owner_id, d, end)
                data_points.append(RevenueChartPoint(label=d.strftime("%b"), revenue=rev))
            total = sum(p.revenue for p in data_points)
            return RevenueChartResponse(total_revenue=total, data=data_points)

        for i in range(5, -1, -1):
            month_date = today - timedelta(days=30 * i)
            d_start = month_date.replace(day=1)
            if month_date.month == 12:
                d_end = d_start.replace(year=d_start.year + 1, month=1, day=1)
            else:
                d_end = d_start.replace(month=d_start.month + 1, day=1)
            rev = await self._get_revenue(owner_id, d_start, d_end)
            prev_year = d_start.replace(year=d_start.year - 1)
            prev_year_end = d_end.replace(year=d_end.year - 1)
            prev_rev = await self._get_revenue(owner_id, prev_year, prev_year_end)
            data_points.append(RevenueChartPoint(
                label=d_start.strftime("%b"), revenue=rev, previous_revenue=prev_rev
            ))
        total = sum(p.revenue for p in data_points)
        return RevenueChartResponse(total_revenue=total, data=data_points)

    async def get_booking_performance(self, owner_id: int) -> BookingPerformance:
        eq_ids = await self._get_owner_equipment_ids(owner_id)
        if not eq_ids:
            return BookingPerformance()

        query = (
            select(Booking.status, func.count())
            .where(Booking.equipment_id.in_(eq_ids))
            .group_by(Booking.status)
        )
        result = await self.db.execute(query)
        status_counts = {row[0].value: row[1] for row in result.all()}

        total = sum(status_counts.values())
        completed = status_counts.get("COMPLETED", 0)
        pending = status_counts.get("PENDING", 0)
        cancelled = status_counts.get("CANCELLED", 0)
        rejected = status_counts.get("REJECTED", 0)
        confirmed = status_counts.get("CONFIRMED", 0)

        return BookingPerformance(
            completed=completed,
            pending=pending,
            cancelled=cancelled,
            rejected=rejected,
            confirmed=confirmed,
            total=total,
            completion_pct=(completed / total * 100) if total > 0 else 0.0,
        )

    async def get_recent_bookings(self, owner_id: int, limit: int = 10) -> list[RecentBooking]:
        eq_ids = await self._get_owner_equipment_ids(owner_id)
        if not eq_ids:
            return []

        query = (
            select(Booking)
            .where(Booking.equipment_id.in_(eq_ids))
            .order_by(Booking.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(query)
        bookings = result.scalars().all()

        recent = []
        for b in bookings:
            customer_name = "Unknown"
            if hasattr(b, "customer") and b.customer:
                customer_name = b.customer.display_name or b.customer.email

            equipment_name = "Unknown"
            if hasattr(b, "equipment") and b.equipment:
                equipment_name = b.equipment.name

            recent.append(RecentBooking(
                id=b.id,
                customer_name=customer_name,
                equipment_name=equipment_name,
                start_date=b.start_date,
                end_date=b.end_date,
                total_price=float(b.total_price),
                status=b.status.value,
                created_at=b.created_at.isoformat(),
            ))

        return recent

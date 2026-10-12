from datetime import date, datetime, time, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.models.listing import Listing
from app.models.payment import Payment
from app.models.rental_request import RentalRequest
from app.core.enums import (
    ListingStatus,
    PaymentStatus,
    PaymentType,
    RentalRequestStatus,
)
from app.schemas.dashboard import (
    DashboardSummary, RevenueChartPoint, RevenueChartResponse,
    BookingPerformance, RecentBooking,
)


def _view_status(status: RentalRequestStatus) -> str:
    """A rental request as the panel's booking table words it.

    The table was written against booking statuses, and an accepted
    request is exactly what a confirmed booking means — so it goes over
    as CONFIRMED and is coloured the way the rest of the page colours
    it. Every other status already carries the same word on both sides.
    """
    if status == RentalRequestStatus.ACCEPTED:
        return "CONFIRMED"
    return status.value


class DashboardService:
    """The owner's panel, read off the rows the site actually runs on.

    Everything here is listing work: rental requests against the owner's
    listings, and the payments settled against those requests — or
    against a listing the owner sold. The previous version counted
    equipment bookings, a separate road nobody walks on this site, and
    an owner with no equipment therefore saw every figure answer 0.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # -- money ----------------------------------------------------------

    @staticmethod
    def _at(day: date) -> datetime:
        return datetime.combine(day, time.min)

    async def _revenue_rows(
        self, owner_id: int, start: date, end: date
    ) -> list[tuple[date, float]]:
        """Every somoni the owner received in ``[start, end)``.

        A payment counts for the owner it was taken in the name of: a
        rental request they accepted, or a listing they sold. The day is
        when the payment settled, which is what a revenue line means —
        money arriving, not a stay that has not happened yet.
        """
        query = (
            select(Payment.created_at, Payment.amount)
            .outerjoin(RentalRequest, RentalRequest.id == Payment.rental_request_id)
            .outerjoin(Listing, Listing.id == Payment.listing_id)
            .where(
                Payment.status == PaymentStatus.PAID,
                Payment.payment_type != PaymentType.REFUND,
                Payment.created_at >= self._at(start),
                Payment.created_at < self._at(end),
                or_(
                    RentalRequest.owner_id == owner_id,
                    Listing.owner_id == owner_id,
                ),
            )
        )
        rows = await self.db.execute(query)
        return [(created.date(), float(amount)) for created, amount in rows.all()]

    async def _get_revenue(self, owner_id: int, start: date, end: date) -> float:
        rows = await self._revenue_rows(owner_id, start, end)
        return round(sum(amount for _, amount in rows), 2)

    # -- counts ---------------------------------------------------------

    async def _get_bookings_count(self, owner_id: int, start: date, end: date) -> int:
        query = (
            select(func.count())
            .select_from(RentalRequest)
            .where(
                RentalRequest.owner_id == owner_id,
                RentalRequest.start_date >= start,
                RentalRequest.start_date < end,
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one() or 0

    async def _get_active_rentals_count(self, owner_id: int) -> int:
        # An accepted request is the site's live rental: the owner said
        # yes, the renter is paying or has paid, the thing is spoken for.
        query = (
            select(func.count())
            .select_from(RentalRequest)
            .where(
                RentalRequest.owner_id == owner_id,
                RentalRequest.status == RentalRequestStatus.ACCEPTED,
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one() or 0

    async def _get_occupancy_rate(self, owner_id: int, today: date) -> float:
        """Share of the owner's live listings let out on this very day."""
        listing_query = (
            select(func.count())
            .select_from(Listing)
            .where(
                Listing.owner_id == owner_id,
                Listing.status == ListingStatus.ACTIVE,
                Listing.available == True,  # noqa: E712
            )
        )
        total_active = (await self.db.execute(listing_query)).scalar_one() or 0
        if total_active == 0:
            return 0.0

        booked_query = (
            select(func.count(func.distinct(RentalRequest.listing_id)))
            .select_from(RentalRequest)
            .where(
                RentalRequest.owner_id == owner_id,
                RentalRequest.status == RentalRequestStatus.ACCEPTED,
                RentalRequest.start_date <= today,
                RentalRequest.end_date >= today,
            )
        )
        booked = (await self.db.execute(booked_query)).scalar_one() or 0
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
        """One read of the payment table, laid out over the period.

        The buckets are worked out first and then filled from the rows
        once — the old shape asked the database the same question a day
        at a time, thirty times over for a month's chart.
        """
        today = date.today()
        buckets: list[tuple[str, date, date]] = []
        with_previous = False

        if period == "7days":
            for i in range(6, -1, -1):
                d = today - timedelta(days=i)
                buckets.append((d.strftime("%b %d"), d, d + timedelta(days=1)))

        elif period == "30days":
            for i in range(29, -1, -1):
                d = today - timedelta(days=i)
                buckets.append((d.strftime("%b %d"), d, d + timedelta(days=1)))

        elif period == "thismonth":
            for day in range(1, today.day + 1):
                d = today.replace(day=day)
                buckets.append((str(day), d, d + timedelta(days=1)))

        elif period == "lastyear":
            for month in range(1, 13):
                d = today.replace(month=month, day=1)
                end = (
                    d.replace(year=d.year + 1, month=1, day=1)
                    if month == 12
                    else d.replace(month=month + 1, day=1)
                )
                buckets.append((d.strftime("%b"), d, end))

        else:
            # Six calendar months, each next to the same month a year
            # before — the only period that carries a comparison line.
            with_previous = True
            for i in range(5, -1, -1):
                month_date = today - timedelta(days=30 * i)
                d_start = month_date.replace(day=1)
                if month_date.month == 12:
                    d_end = d_start.replace(year=d_start.year + 1, month=1, day=1)
                else:
                    d_end = d_start.replace(month=d_start.month + 1, day=1)
                buckets.append((d_start.strftime("%b"), d_start, d_end))

        window_start = min(b[1] for b in buckets)
        window_end = max(b[2] for b in buckets)
        rows = await self._revenue_rows(owner_id, window_start, window_end)

        totals = [0.0] * len(buckets)
        for day, amount in rows:
            for i, (_, start, end) in enumerate(buckets):
                if start <= day < end:
                    totals[i] += amount
                    break

        previous: list[float] = []
        if with_previous:
            previous = [0.0] * len(buckets)
            prev_rows = await self._revenue_rows(
                owner_id,
                window_start.replace(year=window_start.year - 1),
                window_end.replace(year=window_end.year - 1),
            )
            for day, amount in prev_rows:
                for i, (_, start, end) in enumerate(buckets):
                    if (
                        start.replace(year=start.year - 1)
                        <= day
                        < end.replace(year=end.year - 1)
                    ):
                        previous[i] += amount
                        break

        data = [
            RevenueChartPoint(
                label=label,
                revenue=round(totals[i], 2),
                previous_revenue=round(previous[i], 2) if previous else 0.0,
            )
            for i, (label, _, _) in enumerate(buckets)
        ]
        return RevenueChartResponse(
            total_revenue=round(sum(totals), 2), data=data
        )

    async def get_booking_performance(self, owner_id: int) -> BookingPerformance:
        query = (
            select(RentalRequest.status, func.count())
            .where(RentalRequest.owner_id == owner_id)
            .group_by(RentalRequest.status)
        )
        result = await self.db.execute(query)
        counts = {row[0].value: row[1] for row in result.all()}

        total = sum(counts.values())
        completed = counts.get("COMPLETED", 0)
        pending = counts.get("PENDING", 0)
        cancelled = counts.get("CANCELLED", 0)
        rejected = counts.get("REJECTED", 0)
        # Accepted is the panel's "confirmed": the owner said yes and the
        # booking stands. Same bucket BookingsSection filters by.
        confirmed = counts.get("ACCEPTED", 0)

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
        query = (
            select(RentalRequest)
            .where(RentalRequest.owner_id == owner_id)
            .order_by(RentalRequest.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(query)
        requests = result.scalars().all()

        recent = []
        for r in requests:
            renter = r.renter
            customer_name = (
                (renter.display_name or renter.email)
                if renter
                else f"#{r.renter_id}"
            )
            listing = r.listing
            recent.append(RecentBooking(
                id=r.id,
                customer_name=customer_name,
                equipment_name=(listing.title if listing else f"#{r.listing_id}"),
                start_date=r.start_date,
                end_date=r.end_date,
                total_price=float(r.total_price),
                status=_view_status(r.status),
                created_at=r.created_at.isoformat(),
            ))

        return recent

from datetime import date, timedelta
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rental_request import RentalRequest, RentalRequestStatus
from app.models.listing import Listing, PriceUnit
from app.repositories.rental_request import RentalRequestRepository
from app.repositories.listing import ListingRepository
from app.services.notification import NotificationService
from app.schemas.rental_request import RentalRequestCreate


def calculate_total_days(start_date: date, end_date: date) -> int:
    delta = end_date - start_date
    return max(delta.days, 1)


def calculate_total_price(listing: Listing, total_days: int) -> float:
    price = float(listing.price)
    unit = listing.price_unit
    if unit == PriceUnit.PER_HOUR:
        days_in_unit = 1
        hours = total_days * 24
        return price * hours
    elif unit == PriceUnit.PER_DAY:
        return price * total_days
    elif unit == PriceUnit.PER_WEEK:
        return price * (total_days / 7)
    elif unit == PriceUnit.PER_MONTH:
        return price * (total_days / 30)
    return price * total_days


class RentalRequestService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = RentalRequestRepository(db)
        self.listing_repo = ListingRepository(db)
        self.notif_service = NotificationService(db)

    async def create(self, renter_id: int, data: RentalRequestCreate) -> RentalRequest:
        listing = await self.listing_repo.get_by_id(data.listing_id)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        if listing.owner_id == renter_id:
            raise HTTPException(status_code=400, detail="Cannot rent your own listing")
        if data.start_date >= data.end_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")

        has_conflict = await self.repo.check_date_conflicts(
            data.listing_id, data.start_date, data.end_date
        )
        if has_conflict:
            raise HTTPException(status_code=409, detail="Listing is not available for the selected dates")

        total_days = calculate_total_days(data.start_date, data.end_date)
        total_price = calculate_total_price(listing, total_days)
        deposit_amount = float(listing.deposit)

        request = await self.repo.create(
            listing_id=data.listing_id,
            renter_id=renter_id,
            owner_id=listing.owner_id,
            start_date=data.start_date,
            end_date=data.end_date,
            total_days=total_days,
            total_price=total_price,
            deposit_amount=deposit_amount,
            message=data.message,
            status=RentalRequestStatus.PENDING,
        )

        await self.notif_service.create(
            user_id=listing.owner_id,
            title="New Rental Request",
            message=f"Someone wants to rent {listing.title}",
            type="rental_request",
            reference_id=request.id,
            reference_type="rental_request",
        )

        return request

    async def accept(self, request_id: int, owner_id: int, response: str | None = None) -> RentalRequest:
        request = await self.repo.get_by_id(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Rental request not found")
        if request.owner_id != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        if request.status != RentalRequestStatus.PENDING:
            raise HTTPException(status_code=400, detail="Request is not pending")

        request = await self.repo.update(
            request,
            status=RentalRequestStatus.ACCEPTED,
            owner_response=response,
        )

        await self.notif_service.create(
            user_id=request.renter_id,
            title="Rental Request Accepted",
            message="Your rental request has been accepted!",
            type="rental_accepted",
            reference_id=request.id,
            reference_type="rental_request",
        )

        return request

    async def reject(self, request_id: int, owner_id: int, response: str | None = None) -> RentalRequest:
        request = await self.repo.get_by_id(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Rental request not found")
        if request.owner_id != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        if request.status != RentalRequestStatus.PENDING:
            raise HTTPException(status_code=400, detail="Request is not pending")

        request = await self.repo.update(
            request,
            status=RentalRequestStatus.REJECTED,
            owner_response=response,
        )

        await self.notif_service.create(
            user_id=request.renter_id,
            title="Rental Request Rejected",
            message="Your rental request has been rejected.",
            type="rental_rejected",
            reference_id=request.id,
            reference_type="rental_request",
        )

        return request

    async def cancel(self, request_id: int, renter_id: int) -> RentalRequest:
        request = await self.repo.get_by_id(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Rental request not found")
        if request.renter_id != renter_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        if request.status not in [RentalRequestStatus.PENDING, RentalRequestStatus.ACCEPTED]:
            raise HTTPException(status_code=400, detail="Request cannot be cancelled")

        request = await self.repo.update(request, status=RentalRequestStatus.CANCELLED)

        await self.notif_service.create(
            user_id=request.owner_id,
            title="Rental Request Cancelled",
            message="A rental request was cancelled by the renter.",
            type="rental_cancelled",
            reference_id=request.id,
            reference_type="rental_request",
        )

        return request

    async def complete(self, request_id: int, owner_id: int) -> RentalRequest:
        request = await self.repo.get_by_id(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Rental request not found")
        if request.owner_id != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        if request.status != RentalRequestStatus.ACCEPTED:
            raise HTTPException(status_code=400, detail="Only accepted requests can be completed")

        request = await self.repo.update(request, status=RentalRequestStatus.COMPLETED)

        listing = await self.listing_repo.get_by_id(request.listing_id)
        if listing:
            listing.available = True
            await self.db.flush()

        await self.notif_service.create(
            user_id=request.renter_id,
            title="Rental Completed",
            message=f"The rental of {listing.title if listing else 'your rental'} has been completed. You can now leave a review.",
            type="rental_completed",
            reference_id=request.id,
            reference_type="rental_request",
        )

        return request

    async def get_by_renter(self, renter_id: int, skip: int = 0, limit: int = 20) -> tuple[list[RentalRequest], int]:
        requests = await self.repo.get_by_renter(renter_id, skip, limit)
        total = await self.repo.count_by_renter(renter_id)
        return requests, total

    async def get_by_owner(self, owner_id: int, skip: int = 0, limit: int = 20) -> tuple[list[RentalRequest], int]:
        requests = await self.repo.get_by_owner(owner_id, skip, limit)
        total = await self.repo.count_by_owner(owner_id)
        return requests, total

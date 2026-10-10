from datetime import date, datetime, timedelta
from fastapi import HTTPException
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.listing import Listing, ListingStatus
from app.models.conversation import Conversation
from app.models.listing_image import ListingImage
from app.models.rental_request import RentalRequest, RentalRequestStatus
from app.repositories.listing import ListingRepository
from app.repositories.favorite import FavoriteRepository
from app.schemas.listing import ListingCreate, ListingUpdate
from app.services.notification import NotificationService
from app.core.enums import VerificationStatus

LISTING_TTL_DAYS = 30


async def detach_listing_conversations(db: AsyncSession, listing_id: int) -> None:
    await db.execute(
        update(Conversation)
        .where(Conversation.listing_id == listing_id)
        .values(listing_id=None)
    )


class ListingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ListingRepository(db)
        self.fav_repo = FavoriteRepository(db)
        self.notif_service = NotificationService(db)

    async def create(self, owner_id: int, data: ListingCreate) -> Listing:
        image_urls = data.image_urls
        data_dict = data.model_dump(exclude={"image_urls"})
        listing = await self.repo.create(
            owner_id=owner_id,
            status=ListingStatus.ACTIVE,
            expires_at=datetime.utcnow() + timedelta(days=LISTING_TTL_DAYS),
            **data_dict,
        )

        for i, url in enumerate(image_urls):
            self.db.add(
                ListingImage(
                    listing_id=listing.id,
                    image_url=url,
                    is_primary=(i == 0),
                    sort_order=i,
                )
            )
        await self.db.flush()
        await self.db.refresh(listing)
        return listing

    async def get_by_id(self, listing_id: int) -> Listing:
        listing = await self.repo.get_by_id(listing_id)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        return listing

    async def update(
        self, listing_id: int, owner_id: int, data: ListingUpdate, *, is_admin: bool = False
    ) -> Listing:
        listing = await self.repo.get_by_id(listing_id)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        # An admin moderates every listing, not only the ones they posted
        # — the same rule delete() below already follows.
        if listing.owner_id != owner_id and not is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to update this listing")
        moderated = listing.owner_id != owner_id
        update_data = data.model_dump(exclude_unset=True)

        new_status = update_data.get("status")
        new_available = update_data.get("available")
        was_visible = listing.status == ListingStatus.ACTIVE and listing.available
        now_deactivated = (
            (new_status in (ListingStatus.PAUSED, ListingStatus.REMOVED, ListingStatus.EXPIRED)
             and listing.status != new_status)
            or (new_available is False and listing.available)
        )

        updated = await self.repo.update(listing, **update_data)

        if was_visible and now_deactivated:
            await self.notif_service.create(
                user_id=listing.owner_id,
                title="Listing Deactivated",
                message=f"Your listing '{listing.title}' has been deactivated.",
                type="listing_deactivated",
                reference_id=listing.id,
                reference_type="listing",
                data={
                    "listing_id": listing.id,
                    "listing_title": listing.title,
                    "reason": "deactivated_by_admin" if moderated else "deactivated_by_owner",
                },
            )
        return updated

    async def delete(self, listing_id: int, owner_id: int, *, is_admin: bool = False) -> None:
        listing = await self.repo.get_by_id(listing_id)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        # An admin moderates every listing, not only the ones they posted; a
        # regular user still only their own.
        if listing.owner_id != owner_id and not is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to delete this listing")
        # Taking down somebody else's listing is moderation, so the owner is
        # told who did it instead of being left to think they removed it
        # themselves.
        moderated = listing.owner_id != owner_id
        await self.notif_service.create(
            user_id=listing.owner_id,
            title="Listing Deactivated",
            message=(
                f"Your listing '{listing.title}' was removed by the administration."
                if moderated
                else f"Your listing '{listing.title}' has been removed."
            ),
            type="listing_deactivated",
            reference_id=None,
            reference_type="listing",
            data={
                "listing_id": listing.id,
                "listing_title": listing.title,
                "reason": "removed_by_admin" if moderated else "deleted_by_owner",
            },
        )
        await detach_listing_conversations(self.db, listing_id)
        await self.repo.delete(listing)

    async def search(self, **kwargs) -> tuple[list[Listing], int]:
        skip = kwargs.pop("skip", 0)
        limit = kwargs.pop("limit", 20)
        sort_by = kwargs.pop("sort_by", None)
        listings = await self.repo.search(skip=skip, limit=limit, sort_by=sort_by, **kwargs)
        total = await self.repo.count_filtered(**kwargs)
        return listings, total

    async def nearby(self, latitude: float, longitude: float, radius_km: float = 5.0, **kwargs) -> list[Listing]:
        skip = kwargs.pop("skip", 0)
        limit = kwargs.pop("limit", 20)
        sort_by = kwargs.pop("sort_by", None)
        return await self.repo.nearby(
            latitude, longitude, radius_km, skip=skip, limit=limit, sort_by=sort_by, **kwargs
        )

    async def submit_for_verification(self, listing_id: int, owner_id: int) -> Listing:
        listing = await self.repo.get_by_id(listing_id)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        if listing.owner_id != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this listing")
        listing.verification_status = VerificationStatus.PENDING
        listing.is_verified = False
        await self.db.flush()
        await self.db.refresh(listing)
        return listing

    async def increment_views(self, listing_id: int) -> None:
        listing = await self.repo.get_by_id(listing_id)
        if listing:
            await self.repo.increment_views(listing)
            # SQLite lets one writer in at a time, and this counter is the
            # only write a page view performs. Left to the request's own
            # commit, the lock then survived everything that follows - the
            # favourite lookup, the TOP lookup, the image URLs - so concurrent
            # views lined up behind one another and the driver eventually gave
            # up with "database is locked", which surfaced as a 500 on the
            # listing page. Committing here shrinks the lock from the length
            # of the request to the length of one UPDATE. Nothing else has
            # been written yet, so there is nothing to lose; the response
            # keeps reading from this session afterwards.
            await self.db.commit()

    async def get_by_owner(self, owner_id: int, skip: int = 0, limit: int = 20) -> tuple[list[Listing], int]:
        listings = await self.repo.get_by_owner(owner_id, skip, limit)
        total = await self.repo.count_by_owner(owner_id)
        return listings, total

    async def check_availability(self, listing_id: int, start_date: date, end_date: date) -> bool:
        listing = await self.repo.get_by_id(listing_id)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        result = await self.db.execute(
            select(func.count())
            .select_from(RentalRequest)
            .where(
                RentalRequest.listing_id == listing_id,
                RentalRequest.status.in_([RentalRequestStatus.PENDING, RentalRequestStatus.ACCEPTED]),
                RentalRequest.start_date <= end_date,
                RentalRequest.end_date >= start_date,
            )
        )
        return result.scalar_one() == 0

    async def get_calendar(self, listing_id: int, start_date: date, end_date: date) -> list[dict]:
        listing = await self.repo.get_by_id(listing_id)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        result = await self.db.execute(
            select(RentalRequest.start_date, RentalRequest.end_date, RentalRequest.status)
            .where(
                RentalRequest.listing_id == listing_id,
                RentalRequest.status.in_([
                    RentalRequestStatus.PENDING,
                    RentalRequestStatus.ACCEPTED,
                    RentalRequestStatus.COMPLETED,
                ]),
                RentalRequest.start_date <= end_date,
                RentalRequest.end_date >= start_date,
            )
        )
        days: dict[str, str] = {}
        for req_start, req_end, status in result.all():
            day_status = "pending" if status == RentalRequestStatus.PENDING else "booked"
            current = max(req_start, start_date)
            last = min(req_end, end_date)
            while current <= last:
                key = current.isoformat()
                if days.get(key) != "booked":
                    days[key] = day_status
                current += timedelta(days=1)
        return [{"date": key, "status": days[key]} for key in sorted(days)]

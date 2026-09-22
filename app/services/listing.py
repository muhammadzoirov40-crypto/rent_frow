from datetime import date
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
from app.core.enums import VerificationStatus


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

    async def create(self, owner_id: int, data: ListingCreate) -> Listing:
        image_urls = data.image_urls
        data_dict = data.model_dump(exclude={"image_urls"})
        listing = await self.repo.create(owner_id=owner_id, status=ListingStatus.ACTIVE, **data_dict)

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

    async def update(self, listing_id: int, owner_id: int, data: ListingUpdate) -> Listing:
        listing = await self.repo.get_by_id(listing_id)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        if listing.owner_id != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this listing")
        update_data = data.model_dump(exclude_unset=True)
        return await self.repo.update(listing, **update_data)

    async def delete(self, listing_id: int, owner_id: int) -> None:
        listing = await self.repo.get_by_id(listing_id)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        if listing.owner_id != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this listing")
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

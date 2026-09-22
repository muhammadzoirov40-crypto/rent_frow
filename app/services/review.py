from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.review import Review
from app.models.rental_request import RentalRequest, RentalRequestStatus
from app.models.listing import Listing
from app.schemas.review import ReviewCreate, ReviewUpdate
from app.services.notification import NotificationService


class ReviewService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.notif_service = NotificationService(db)

    def _refresh_listing_rating(self, listing: Listing, delta_sum: float, delta_count: int) -> None:
        listing.rating_sum = float(listing.rating_sum) + delta_sum
        listing.rating_count = max(listing.rating_count + delta_count, 0)

    async def _resolve_transaction(
        self, customer_id: int, listing_id: int, rental_request_id: int | None
    ) -> RentalRequest | None:
        if rental_request_id is not None:
            request = await self.db.get(RentalRequest, rental_request_id)
            if not request or request.renter_id != customer_id:
                raise HTTPException(status_code=403, detail="Not authorized to review this transaction")
            if request.listing_id != listing_id:
                raise HTTPException(status_code=400, detail="Transaction does not belong to this listing")
            if request.status != RentalRequestStatus.COMPLETED:
                raise HTTPException(status_code=400, detail="Can only review a completed rental")
            return request

        result = await self.db.execute(
            select(RentalRequest)
            .where(
                RentalRequest.renter_id == customer_id,
                RentalRequest.listing_id == listing_id,
                RentalRequest.status == RentalRequestStatus.COMPLETED,
            )
            .order_by(RentalRequest.id.desc())
        )
        return result.scalars().first()

    async def create(self, customer_id: int, listing_id: int, data: ReviewCreate) -> Review:
        listing = await self.db.get(Listing, listing_id)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        if listing.owner_id == customer_id:
            raise HTTPException(status_code=400, detail="Cannot review your own listing")

        rental_request = await self._resolve_transaction(customer_id, listing_id, data.rental_request_id)

        if rental_request and rental_request.review:
            raise HTTPException(status_code=409, detail="You have already reviewed this rental")

        existing = await self.db.execute(
            select(Review).where(
                Review.customer_id == customer_id,
                Review.listing_id == listing_id,
            )
        )
        if existing.scalars().first():
            raise HTTPException(status_code=409, detail="You have already reviewed this listing")

        review = Review(
            customer_id=customer_id,
            listing_id=listing_id,
            rental_request_id=rental_request.id if rental_request else None,
            rating=data.rating,
            comment=data.comment,
        )
        self.db.add(review)

        self._refresh_listing_rating(listing, data.rating, 1)
        await self.db.flush()
        await self.db.refresh(review)

        await self.notif_service.create(
            user_id=listing.owner_id,
            title="New Review",
            message=f"Your listing '{listing.title}' received a {data.rating}-star review",
            type="new_review",
            reference_id=listing_id,
            reference_type="listing",
        )

        return review

    async def list_by_listing(self, listing_id: int, skip: int = 0, limit: int = 20) -> tuple[list[Review], int]:
        result = await self.db.execute(
            select(Review)
            .where(Review.listing_id == listing_id)
            .order_by(desc(Review.created_at))
            .offset(skip)
            .limit(limit)
        )
        reviews = list(result.scalars().all())

        total = (
            await self.db.execute(
                select(func.count()).select_from(Review).where(Review.listing_id == listing_id)
            )
        ).scalar_one()

        for r in reviews:
            if r.customer:
                r.customer_name = r.customer.display_name or r.customer.email

        return reviews, total

    async def update(self, review_id: int, customer_id: int, data: ReviewUpdate) -> Review:
        review = await self.db.get(Review, review_id)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        if review.customer_id != customer_id:
            raise HTTPException(status_code=403, detail="Not authorized to edit this review")

        listing = await self.db.get(Listing, review.listing_id)
        update_data = data.model_dump(exclude_unset=True)

        if "rating" in update_data and update_data["rating"] is not None:
            listing.rating_sum = max(float(listing.rating_sum) - review.rating + update_data["rating"], 0)

        for key, value in update_data.items():
            setattr(review, key, value)

        await self.db.flush()
        await self.db.refresh(review)
        return review

    async def delete(self, review_id: int, actor_id: int, is_admin: bool = False) -> None:
        review = await self.db.get(Review, review_id)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        if not is_admin and review.customer_id != actor_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this review")

        listing = await self.db.get(Listing, review.listing_id)
        self._refresh_listing_rating(listing, -review.rating, -1)
        await self.db.delete(review)
        await self.db.flush()
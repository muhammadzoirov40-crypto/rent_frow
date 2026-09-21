from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from app.models.review import Review
from app.models.booking import Booking
from app.models.equipment import Equipment
from app.schemas.review import ReviewCreate, ReviewUpdate
from app.core.enums import BookingStatus


class ReviewService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, customer_id: int, data: ReviewCreate) -> Review:
        booking = await self.db.get(Booking, data.booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        if booking.customer_id != customer_id:
            raise HTTPException(status_code=403, detail="Access denied")
        if booking.status != BookingStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Can only review completed bookings")

        existing = await self.db.execute(
            select(Review).where(Review.booking_id == data.booking_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Review already exists for this booking")

        if data.equipment_id != booking.equipment_id:
            raise HTTPException(status_code=400, detail="Equipment ID does not match booking")

        review = Review(
            customer_id=customer_id,
            equipment_id=data.equipment_id,
            booking_id=data.booking_id,
            rating=data.rating,
            comment=data.comment,
        )
        self.db.add(review)
        await self.db.commit()
        await self.db.refresh(review)
        return review

    async def get_by_equipment(self, equipment_id: int, skip: int = 0, limit: int = 20) -> tuple[list[Review], int]:
        query = (
            select(Review)
            .where(Review.equipment_id == equipment_id)
            .order_by(Review.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        reviews = list(result.scalars().all())

        count_query = select(Review).where(Review.equipment_id == equipment_id)
        count_result = await self.db.execute(count_query)
        total = len(list(count_result.scalars().all()))

        for r in reviews:
            if r.customer and r.customer.display_name:
                r.customer_name = r.customer.display_name
            elif r.customer:
                r.customer_name = r.customer.email
            if r.equipment:
                r.equipment_name = r.equipment.name

        return reviews, total

    async def update(self, review_id: int, customer_id: int, data: ReviewUpdate) -> Review:
        review = await self.db.get(Review, review_id)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        if review.customer_id != customer_id:
            raise HTTPException(status_code=403, detail="Access denied")

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(review, key, value)

        await self.db.commit()
        await self.db.refresh(review)
        return review

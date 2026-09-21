from datetime import datetime
from sqlalchemy import Integer, DateTime, Text, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    listing_id: Mapped[int] = mapped_column(Integer, ForeignKey("listings.id"), nullable=False, index=True)
    booking_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("bookings.id"), nullable=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("User", back_populates="reviews_given", lazy="selectin")
    listing = relationship("Listing", back_populates="reviews", lazy="selectin")
    booking = relationship("Booking", back_populates="review", uselist=False, lazy="selectin")

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_review_rating"),
        Index("idx_review_listing_rating", "listing_id", "rating"),
    )

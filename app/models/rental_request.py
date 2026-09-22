from datetime import datetime, date
from sqlalchemy import Integer, DateTime, Date, Numeric, Text, ForeignKey, Index, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.core.enums import RentalRequestStatus


class RentalRequest(Base):
    __tablename__ = "rental_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    listing_id: Mapped[int] = mapped_column(Integer, ForeignKey("listings.id"), nullable=False, index=True)
    renter_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_days: Mapped[int] = mapped_column(Integer, nullable=False)
    total_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    deposit_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[RentalRequestStatus] = mapped_column(
        SAEnum(RentalRequestStatus), default=RentalRequestStatus.PENDING, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    listing = relationship("Listing", back_populates="rental_requests", lazy="selectin")
    renter = relationship("User", foreign_keys=[renter_id], back_populates="rental_requests_as_renter", lazy="selectin")
    owner = relationship("User", foreign_keys=[owner_id], back_populates="rental_requests_as_owner", lazy="selectin")
    review = relationship("Review", back_populates="rental_request", uselist=False, lazy="selectin")

    __table_args__ = (
        Index("idx_rental_request_renter_status", "renter_id", "status"),
        Index("idx_rental_request_owner_status", "owner_id", "status"),
    )

from datetime import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum
from app.core.database import Base
from app.core.enums import RentalStatus


class Rental(Base):
    __tablename__ = "rentals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    booking_id: Mapped[int] = mapped_column(Integer, ForeignKey("bookings.id"), unique=True, nullable=False, index=True)
    equipment_id: Mapped[int] = mapped_column(Integer, ForeignKey("equipment.id"), nullable=False, index=True)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    pickup_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expected_return_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[RentalStatus] = mapped_column(
        SAEnum(RentalStatus), default=RentalStatus.RESERVED, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    booking = relationship("Booking", back_populates="rental", lazy="selectin")
    equipment = relationship("Equipment", back_populates="rentals", lazy="selectin")
    customer = relationship("User", back_populates="rentals", lazy="selectin")
    inspection = relationship("Inspection", back_populates="rental", uselist=False, lazy="selectin")
    penalties = relationship("Penalty", back_populates="rental", lazy="selectin")

    __table_args__ = (
        Index("idx_rental_customer_status", "customer_id", "status"),
        Index("idx_rental_equipment_status", "equipment_id", "status"),
    )

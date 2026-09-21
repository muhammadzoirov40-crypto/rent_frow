from datetime import datetime, date
from sqlalchemy import Integer, String, DateTime, Date, Numeric, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum
from app.core.database import Base
from app.core.enums import BookingStatus


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    equipment_id: Mapped[int] = mapped_column(Integer, ForeignKey("equipment.id"), nullable=False, index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    deposit_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[BookingStatus] = mapped_column(
        SAEnum(BookingStatus), default=BookingStatus.PENDING, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    customer = relationship("User", back_populates="bookings", lazy="selectin")
    equipment = relationship("Equipment", back_populates="bookings", lazy="selectin")
    payments = relationship("Payment", back_populates="booking", lazy="selectin")
    rental = relationship("Rental", back_populates="booking", uselist=False, lazy="selectin")
    review = relationship("Review", back_populates="booking", uselist=False, lazy="selectin")

    __table_args__ = (
        Index("idx_booking_dates", "start_date", "end_date"),
        Index("idx_booking_customer_status", "customer_id", "status"),
        Index("idx_booking_equipment_dates", "equipment_id", "start_date", "end_date"),
    )

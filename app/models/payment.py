from datetime import datetime
from sqlalchemy import Integer, String, DateTime, Numeric, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum
from app.core.database import Base
from app.core.enums import PaymentType, PaymentStatus


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # Either the equipment booking or the rental request the money is for —
    # exactly one of the two is set (PaymentCreate enforces it). booking_id
    # used to be NOT NULL, which made a payment impossible for the flow the
    # site actually runs on: an echo listing -> rental request.
    booking_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("bookings.id"), nullable=True, index=True
    )
    rental_request_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("rental_requests.id"), nullable=True, index=True
    )
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_type: Mapped[PaymentType] = mapped_column(SAEnum(PaymentType), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        SAEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False
    )
    transaction_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    booking = relationship("Booking", back_populates="payments", lazy="selectin")
    rental_request = relationship("RentalRequest", lazy="selectin")
    customer = relationship("User", back_populates="payments", lazy="selectin")

    __table_args__ = (
        Index("idx_payment_customer_status", "customer_id", "status"),
    )

from datetime import datetime
from sqlalchemy import Integer, String, DateTime, Numeric, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum
from app.core.database import Base
from app.core.enums import PenaltyStatus


class Penalty(Base):
    __tablename__ = "penalties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    rental_id: Mapped[int] = mapped_column(Integer, ForeignKey("rentals.id"), nullable=False, index=True)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[PenaltyStatus] = mapped_column(
        SAEnum(PenaltyStatus), default=PenaltyStatus.PENDING, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    rental = relationship("Rental", back_populates="penalties", lazy="selectin")
    customer = relationship("User", back_populates="penalties", lazy="selectin")

    __table_args__ = (
        Index("idx_penalty_customer_status", "customer_id", "status"),
    )

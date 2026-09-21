from datetime import datetime
from sqlalchemy import Integer, String, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.core.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    external_user_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.CUSTOMER, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    is_verified: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    rating_sum: Mapped[float] = mapped_column(default=0, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    listings = relationship("Listing", back_populates="owner", lazy="selectin")
    favorites = relationship("Favorite", back_populates="user", lazy="selectin")
    rental_requests_as_renter = relationship("RentalRequest", foreign_keys="RentalRequest.renter_id", back_populates="renter", lazy="selectin")
    rental_requests_as_owner = relationship("RentalRequest", foreign_keys="RentalRequest.owner_id", back_populates="owner", lazy="selectin")
    notifications = relationship("Notification", back_populates="user", lazy="selectin")
    bookings = relationship("Booking", back_populates="customer", lazy="selectin")
    payments = relationship("Payment", back_populates="customer", lazy="selectin")
    rentals = relationship("Rental", back_populates="customer", lazy="selectin")
    penalties = relationship("Penalty", back_populates="customer", lazy="selectin")
    reviews_given = relationship("Review", back_populates="customer", lazy="selectin")
    posts = relationship("Post", back_populates="author", lazy="selectin")
    comments = relationship("Comment", back_populates="author", lazy="selectin")
    owned_equipment = relationship("Equipment", back_populates="owner", lazy="selectin")
    inspections_done = relationship("Inspection", back_populates="inspector", lazy="selectin")
    sent_messages = relationship("Message", back_populates="sender", lazy="selectin")
    audit_logs = relationship("AuditLog", back_populates="user", lazy="selectin")

    @property
    def average_rating(self) -> float:
        if self.rating_count == 0:
            return 0
        return self.rating_sum / self.rating_count

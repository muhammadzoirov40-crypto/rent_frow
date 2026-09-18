from datetime import datetime
from sqlalchemy import Integer, String, DateTime, Text, Numeric, Boolean, ForeignKey, Index, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.core.enums import EquipmentStatus, EquipmentCondition


class Equipment(Base):
    __tablename__ = "equipment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    serial_number: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    price_per_day: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    deposit_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[EquipmentStatus] = mapped_column(
        SAEnum(EquipmentStatus), default=EquipmentStatus.AVAILABLE, nullable=False
    )
    condition: Mapped[EquipmentCondition] = mapped_column(
        SAEnum(EquipmentCondition), default=EquipmentCondition.GOOD, nullable=False
    )
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    category = relationship("Category", back_populates="equipment", lazy="selectin")
    bookings = relationship("Booking", back_populates="equipment", lazy="selectin")
    rentals = relationship("Rental", back_populates="equipment", lazy="selectin")
    inspections = relationship("Inspection", back_populates="equipment", lazy="selectin")
    maintenances = relationship("Maintenance", back_populates="equipment", lazy="selectin")

    @property
    def category_name(self) -> str | None:
        return self.category.name if self.category else None

    __table_args__ = (
        Index("idx_equipment_status_active", "status", "is_active"),
    )

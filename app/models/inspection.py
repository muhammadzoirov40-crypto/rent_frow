from datetime import datetime
from sqlalchemy import Integer, String, DateTime, Text, Numeric, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Inspection(Base):
    __tablename__ = "inspections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    rental_id: Mapped[int] = mapped_column(Integer, ForeignKey("rentals.id"), unique=True, nullable=False, index=True)
    equipment_id: Mapped[int] = mapped_column(Integer, ForeignKey("equipment.id"), nullable=False, index=True)
    inspector_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    condition_before: Mapped[str | None] = mapped_column(String(50), nullable=True)
    condition_after: Mapped[str | None] = mapped_column(String(50), nullable=True)
    damage_found: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    damage_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    damage_cost: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    rental = relationship("Rental", back_populates="inspection", lazy="selectin")
    equipment = relationship("Equipment", back_populates="inspections", lazy="selectin")
    inspector = relationship("User", back_populates="inspections_done", lazy="selectin")

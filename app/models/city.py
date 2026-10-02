from datetime import datetime
from sqlalchemy import Integer, String, DateTime, Boolean, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class City(Base):
    __tablename__ = "cities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name_tj: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    districts = relationship("District", back_populates="city", lazy="selectin")
    listings = relationship("Listing", back_populates="city_rel", lazy="selectin")

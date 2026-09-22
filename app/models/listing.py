from datetime import datetime
from sqlalchemy import Integer, String, DateTime, Text, Numeric, Boolean, ForeignKey, Index, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.core.enums import PriceUnit, ListingStatus, PropertyType, VerificationStatus


class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    subcategory_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("subcategories.id"), nullable=True)
    city_id: Mapped[int] = mapped_column(Integer, ForeignKey("cities.id"), nullable=False, index=True)
    district_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("districts.id"), nullable=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, index=True)
    price_unit: Mapped[PriceUnit] = mapped_column(
        SAEnum(PriceUnit, values_callable=lambda e: [x.value for x in e]),
        default=PriceUnit.PER_DAY, nullable=False,
    )
    deposit: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)

    property_type: Mapped[PropertyType] = mapped_column(
        SAEnum(PropertyType, values_callable=lambda e: [x.value for x in e]),
        default=PropertyType.APARTMENT, nullable=False, index=True,
    )
    rooms: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    bathrooms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    area_sqm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    furnished: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    parking: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    wifi_included: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)

    address: Mapped[str | None] = mapped_column(String(500), nullable=True)

    verification_status: Mapped[VerificationStatus] = mapped_column(
        SAEnum(VerificationStatus, values_callable=lambda e: [x.value for x in e]),
        default=VerificationStatus.PENDING, nullable=False, index=True,
    )
    status: Mapped[ListingStatus] = mapped_column(
        SAEnum(ListingStatus), default=ListingStatus.ACTIVE, nullable=False
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    views_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rating_sum: Mapped[float] = mapped_column(Numeric(3, 1), default=0, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    rental_rules: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="listings", lazy="selectin")
    category = relationship("Category", back_populates="listings", lazy="selectin")
    subcategory = relationship("SubCategory", back_populates="listings", lazy="selectin")
    city_rel = relationship("City", back_populates="listings", lazy="selectin")
    district_rel = relationship("District", back_populates="listings", lazy="selectin")
    images = relationship("ListingImage", back_populates="listing", lazy="selectin", order_by="ListingImage.is_primary.desc()", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="listing", lazy="selectin", cascade="all, delete-orphan")
    rental_requests = relationship("RentalRequest", back_populates="listing", lazy="selectin", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="listing", lazy="selectin", cascade="all, delete-orphan")

    @property
    def primary_image(self) -> str | None:
        for img in self.images:
            if img.is_primary:
                return img.image_url
        return self.images[0].image_url if self.images else None

    @property
    def average_rating(self) -> float:
        if self.rating_count == 0:
            return 0
        return float(self.rating_sum) / self.rating_count

    __table_args__ = (
        Index("idx_listing_status_created", "status", "created_at"),
        Index("idx_listing_category_city", "category_id", "city_id"),
        Index("idx_listing_owner_status", "owner_id", "status"),
        Index("idx_listing_price_unit", "price", "price_unit"),
        Index("idx_listing_district", "district_id"),
        Index("idx_listing_available_verified", "available", "is_verified"),
    )

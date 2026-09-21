from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.core.enums import ListingStatus, PriceUnit


class ListingImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_url: str
    is_primary: bool
    sort_order: int


class ListingOwnerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    is_verified: bool = False
    rating_sum: float = 0
    rating_count: int = 0


class ListingCreate(BaseModel):
    category_id: int
    subcategory_id: Optional[int] = None
    city_id: int
    district_id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    price_unit: PriceUnit = PriceUnit.PER_DAY
    deposit: float = Field(default=0, ge=0)
    address: Optional[str] = None
    rental_rules: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_name: Optional[str] = None
    image_urls: list[str] = Field(default_factory=list)


class ListingUpdate(BaseModel):
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    city_id: Optional[int] = None
    district_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    price_unit: Optional[PriceUnit] = None
    deposit: Optional[float] = Field(None, ge=0)
    address: Optional[str] = None
    status: Optional[ListingStatus] = None
    rental_rules: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_name: Optional[str] = None


class ListingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    category_id: int
    subcategory_id: Optional[int] = None
    city_id: int
    district_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    price: float
    price_unit: PriceUnit
    deposit: float
    address: Optional[str] = None
    status: ListingStatus
    is_verified: bool
    views_count: int
    rating_sum: float
    rating_count: int
    rental_rules: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    images: list[ListingImageResponse] = []
    owner: Optional[ListingOwnerResponse] = None
    category_name: Optional[str] = None
    city_name: Optional[str] = None
    district_name: Optional[str] = None
    is_favorited: bool = False
    average_rating: float = 0


class ListingListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    price: float
    price_unit: PriceUnit
    city_name: Optional[str] = None
    primary_image: Optional[str] = None
    views_count: int
    average_rating: float = 0
    created_at: datetime
    is_favorited: bool = False


class ListingSearchParams(BaseModel):
    q: Optional[str] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    city_id: Optional[int] = None
    district_id: Optional[int] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    price_unit: Optional[PriceUnit] = None
    status: Optional[ListingStatus] = None
    is_verified: Optional[bool] = None
    sort_by: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

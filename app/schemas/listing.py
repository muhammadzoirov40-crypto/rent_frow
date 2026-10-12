from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.core.enums import (
    ListingStatus,
    ListingPurpose,
    PriceUnit,
    PropertyType,
    VerificationStatus,
)

# The ceiling the form already puts on a price (CreateListingPage's
# MAX_PRICE): a million somoni. It used to live only in the browser, so a
# caller who skipped the form could post a deposit of 10**21 — SQLite
# stores whatever it is given, since it does not enforce the Numeric(10, 2)
# the column declares — and the figure then travelled listing -> rental
# request -> payment, where it became the revenue the admin dashboard
# reads. The rule belongs on the server, where it cannot be walked past.
MAX_LISTING_PRICE = 1_000_000


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
    # Which road the owner is taking. RENT keeps every date, deposit and
    # rule field as it was; SALE is the seller's own path, and the service
    # below strips what only ever belonged to the rental one.
    purpose: ListingPurpose = ListingPurpose.RENT
    price: float = Field(..., gt=0, le=MAX_LISTING_PRICE)
    price_unit: PriceUnit = PriceUnit.PER_DAY
    deposit: float = Field(default=0, ge=0, le=MAX_LISTING_PRICE)
    property_type: PropertyType = PropertyType.APARTMENT
    rooms: Optional[int] = Field(None, ge=0)
    bathrooms: Optional[int] = Field(None, ge=0)
    area_sqm: Optional[int] = Field(None, ge=1)
    furnished: bool = False
    parking: bool = False
    wifi_included: bool = False
    available: bool = True
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    address: Optional[str] = None
    rental_rules: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_name: Optional[str] = None
    image_urls: list[str] = Field(default_factory=list)
    dc_account: Optional[str] = Field(
        None,
        max_length=50,
        description=(
            "The owner's DC wallet, collected while they post. Not a column on "
            "the listing - one person has one wallet however many listings - so "
            "the service folds it into the owner's profile instead."
        ),
    )


class ListingUpdate(BaseModel):
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    city_id: Optional[int] = None
    district_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    purpose: Optional[ListingPurpose] = None
    price: Optional[float] = Field(None, gt=0, le=MAX_LISTING_PRICE)
    price_unit: Optional[PriceUnit] = None
    deposit: Optional[float] = Field(None, ge=0, le=MAX_LISTING_PRICE)
    property_type: Optional[PropertyType] = None
    rooms: Optional[int] = Field(None, ge=0)
    bathrooms: Optional[int] = Field(None, ge=0)
    area_sqm: Optional[int] = Field(None, ge=1)
    furnished: Optional[bool] = None
    parking: Optional[bool] = None
    wifi_included: Optional[bool] = None
    available: Optional[bool] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    address: Optional[str] = None
    status: Optional[ListingStatus] = None
    rental_rules: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_name: Optional[str] = None
    dc_account: Optional[str] = Field(
        None,
        max_length=50,
        description="Same wallet as on create: folded into the owner's profile.",
    )


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
    purpose: ListingPurpose = ListingPurpose.RENT
    deposit: float
    property_type: PropertyType
    rooms: Optional[int] = None
    bathrooms: Optional[int] = None
    area_sqm: Optional[int] = None
    furnished: bool = False
    parking: bool = False
    wifi_included: bool = False
    available: bool = True
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    status: ListingStatus
    verification_status: VerificationStatus = VerificationStatus.PENDING
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
    # True while a paid TOP window is live - drives the badge on the detail
    # page, same server-side rule as the list flag.
    is_top: bool = False


class ListingListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    price: float
    price_unit: PriceUnit
    # RENT or SALE, the same value the card shows as a badge and the
    # search page filters by.
    purpose: ListingPurpose = ListingPurpose.RENT
    property_type: Optional[PropertyType] = None
    rooms: Optional[int] = None
    city_name: Optional[str] = None
    district_name: Optional[str] = None
    primary_image: Optional[str] = None
    views_count: int
    average_rating: float = 0
    rating_count: int = 0
    available: bool = True
    is_verified: bool = False
    created_at: datetime
    is_favorited: bool = False
    # True while a paid TOP window is live (expires_at in the future). The
    # badge and the homepage TOP section are both driven by this flag - the
    # browser never decides it.
    is_top: bool = False
    # Map position: the listing's own pin, or the city centroid as fallback.
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city_id: Optional[int] = None
    # Which shelf the listing sits on. The id lets the client resolve the
    # localised label from its category cache; the name is the fallback for
    # a client whose cache is still empty.
    category_id: Optional[int] = None
    category_name: Optional[str] = None


class NearbyListingResponse(ListingListResponse):
    distance_km: Optional[float] = None


class ListingSearchParams(BaseModel):
    q: Optional[str] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    city_id: Optional[int] = None
    district_id: Optional[int] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    price_unit: Optional[PriceUnit] = None
    purpose: Optional[ListingPurpose] = None
    status: Optional[ListingStatus] = None
    is_verified: Optional[bool] = None
    verification_status: Optional[VerificationStatus] = None
    property_type: Optional[PropertyType] = None
    rooms_min: Optional[int] = Field(None, ge=0)
    rooms_max: Optional[int] = Field(None, ge=0)
    bathrooms_min: Optional[int] = Field(None, ge=0)
    furnished: Optional[bool] = None
    parking: Optional[bool] = None
    wifi_included: Optional[bool] = None
    available: Optional[bool] = None
    sort_by: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

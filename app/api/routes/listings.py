from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_auth, CurrentUser
from app.schemas.listing import (
    ListingCreate, ListingUpdate, ListingResponse,
    ListingListResponse, NearbyListingResponse, ListingImageResponse, ListingOwnerResponse,
)
from app.schemas.base import APIResponse, PaginatedResponse
from app.services.listing import ListingService
from app.services.favorite import FavoriteService
from app.utils.s3 import get_presigned_url

router = APIRouter(prefix="/listings", tags=["Listings"])


def _resolve_image_url(img_url: str | None) -> str | None:
    if not img_url or 'placeholder' in img_url:
        return None
    try:
        return get_presigned_url(img_url, expires_in=86400)
    except Exception:
        return img_url if not img_url.startswith('local:') else None


def _listing_to_response(listing, is_favorited: bool = False) -> ListingResponse:
    images = [
        ListingImageResponse(
            id=img.id,
            image_url=_resolve_image_url(img.image_url),
            is_primary=img.is_primary,
            sort_order=img.sort_order,
        )
        for img in listing.images
        if img.image_url and 'placeholder' not in img.image_url
    ]

    owner = None
    if listing.owner:
        owner_avatar_url = None
        if listing.owner.avatar_url:
            try:
                owner_avatar_url = get_presigned_url(listing.owner.avatar_url, expires_in=86400)
            except Exception:
                owner_avatar_url = listing.owner.avatar_url
        owner = ListingOwnerResponse(
            id=listing.owner.id,
            display_name=listing.owner.display_name,
            avatar_url=owner_avatar_url,
            phone=listing.owner.phone,
            is_verified=listing.owner.is_verified,
            rating_sum=float(listing.owner.rating_sum),
            rating_count=listing.owner.rating_count,
        )

    category_name = listing.category.name if listing.category else None
    city_name = listing.city_rel.name if listing.city_rel else None
    district_name = listing.district_rel.name if listing.district_rel else None

    return ListingResponse(
        id=listing.id,
        owner_id=listing.owner_id,
        category_id=listing.category_id,
        subcategory_id=listing.subcategory_id,
        city_id=listing.city_id,
        district_id=listing.district_id,
        title=listing.title,
        description=listing.description,
        price=float(listing.price),
        price_unit=listing.price_unit,
        deposit=float(listing.deposit),
        property_type=listing.property_type,
        rooms=listing.rooms,
        bathrooms=listing.bathrooms,
        area_sqm=listing.area_sqm,
        furnished=bool(listing.furnished),
        parking=bool(listing.parking),
        wifi_included=bool(listing.wifi_included),
        available=bool(listing.available),
        latitude=float(listing.latitude) if listing.latitude is not None else None,
        longitude=float(listing.longitude) if listing.longitude is not None else None,
        address=listing.address,
        status=listing.status,
        verification_status=listing.verification_status,
        is_verified=listing.is_verified,
        views_count=listing.views_count,
        rating_sum=float(listing.rating_sum),
        rating_count=listing.rating_count,
        rental_rules=listing.rental_rules,
        contact_phone=listing.contact_phone,
        contact_name=listing.contact_name,
        created_at=listing.created_at,
        updated_at=listing.updated_at,
        images=images,
        owner=owner,
        category_name=category_name,
        city_name=city_name,
        district_name=district_name,
        is_favorited=is_favorited,
        average_rating=listing.average_rating,
    )


def _listing_to_list_response(listing, is_favorited: bool = False) -> ListingListResponse:
    primary = listing.primary_image
    if primary and 'placeholder' in primary:
        primary = None
    elif primary:
        try:
            primary = get_presigned_url(primary, expires_in=86400)
        except Exception:
            primary = None
    return ListingListResponse(
        id=listing.id,
        title=listing.title,
        price=float(listing.price),
        price_unit=listing.price_unit,
        property_type=listing.property_type,
        rooms=listing.rooms,
        city_name=listing.city_rel.name if listing.city_rel else None,
        district_name=listing.district_rel.name if listing.district_rel else None,
        primary_image=primary,
        views_count=listing.views_count,
        average_rating=listing.average_rating,
        available=bool(listing.available),
        is_verified=listing.is_verified,
        created_at=listing.created_at,
        is_favorited=is_favorited,
    )


def _listing_to_nearby_response(listing, is_favorited: bool = False) -> NearbyListingResponse:
    resp = _listing_to_list_response(listing, is_favorited)
    distance = getattr(listing, "distance_km", None)
    resp.distance_km = distance
    return resp


@router.get("", response_model=PaginatedResponse[ListingListResponse])
async def search_listings(
    q: str = Query(None),
    category_id: int = Query(None),
    subcategory_id: int = Query(None),
    city_id: int = Query(None),
    district_id: int = Query(None),
    price_min: float = Query(None),
    price_max: float = Query(None),
    price_unit: str = Query(None),
    is_verified: bool = Query(None),
    verification_status: str = Query(None),
    property_type: str = Query(None),
    rooms_min: int = Query(None, ge=0),
    rooms_max: int = Query(None, ge=0),
    bathrooms_min: int = Query(None, ge=0),
    furnished: bool = Query(None),
    parking: bool = Query(None),
    wifi_included: bool = Query(None),
    available: bool = Query(None),
    sort_by: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ListingService(db)
    fav_service = FavoriteService(db)
    skip = (page - 1) * page_size
    listings, total = await service.search(
        q=q,
        category_id=category_id,
        subcategory_id=subcategory_id,
        city_id=city_id,
        district_id=district_id,
        price_min=price_min,
        price_max=price_max,
        price_unit=price_unit,
        is_verified=is_verified,
        verification_status=verification_status,
        property_type=property_type,
        rooms_min=rooms_min,
        rooms_max=rooms_max,
        bathrooms_min=bathrooms_min,
        furnished=furnished,
        parking=parking,
        wifi_included=wifi_included,
        available=available,
        sort_by=sort_by,
        skip=skip,
        limit=page_size,
    )
    items = []
    for listing in listings:
        is_fav = False
        if current_user:
            is_fav = await fav_service.is_favorited(current_user.user_id, listing.id)
        items.append(_listing_to_list_response(listing, is_fav))

    return PaginatedResponse(
        data=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/nearby", response_model=APIResponse[list[NearbyListingResponse]])
async def get_nearby_listings(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius: float = Query(5.0, ge=0.1, le=1000),
    q: str = Query(None),
    category_id: int = Query(None),
    district_id: int = Query(None),
    price_min: float = Query(None),
    price_max: float = Query(None),
    price_unit: str = Query(None),
    property_type: str = Query(None),
    rooms_min: int = Query(None, ge=0),
    rooms_max: int = Query(None, ge=0),
    furnished: bool = Query(None),
    parking: bool = Query(None),
    wifi_included: bool = Query(None),
    available: bool = Query(None),
    is_verified: bool = Query(None),
    sort_by: str = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ListingService(db)
    fav_service = FavoriteService(db)
    listings = await service.nearby(
        latitude=lat,
        longitude=lng,
        radius_km=radius,
        q=q,
        category_id=category_id,
        district_id=district_id,
        price_min=price_min,
        price_max=price_max,
        price_unit=price_unit,
        property_type=property_type,
        rooms_min=rooms_min,
        rooms_max=rooms_max,
        furnished=furnished,
        parking=parking,
        wifi_included=wifi_included,
        available=available,
        is_verified=is_verified,
        sort_by=sort_by,
        limit=limit,
    )
    items = []
    for listing in listings:
        is_fav = False
        if current_user:
            is_fav = await fav_service.is_favorited(current_user.user_id, listing.id)
        items.append(_listing_to_nearby_response(listing, is_fav))
    return APIResponse(data=items)


@router.get("/{listing_id}/availability", response_model=APIResponse[dict])
async def get_availability(
    listing_id: int,
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
):
    service = ListingService(db)
    available = await service.check_availability(listing_id, start_date, end_date)
    return APIResponse(data={"listing_id": listing_id, "available": available})


@router.get("/owner/my", response_model=PaginatedResponse[ListingResponse])
async def get_my_listings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = ListingService(db)
    skip = (page - 1) * page_size
    listings, total = await service.get_by_owner(current_user.user_id, skip, page_size)
    items = [_listing_to_response(l) for l in listings]
    return PaginatedResponse(data=items, total=total, page=page, page_size=page_size)


@router.get("/{listing_id}", response_model=APIResponse[ListingResponse])
async def get_listing(
    listing_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ListingService(db)
    listing = await service.get_by_id(listing_id)
    await service.increment_views(listing_id)

    is_fav = False
    if current_user:
        fav_service = FavoriteService(db)
        is_fav = await fav_service.is_favorited(current_user.user_id, listing_id)

    return APIResponse(data=_listing_to_response(listing, is_fav))


@router.post("", response_model=APIResponse[ListingResponse])
async def create_listing(
    data: ListingCreate,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = ListingService(db)
    listing = await service.create(current_user.user_id, data)
    return APIResponse(message="Listing created successfully", data=_listing_to_response(listing))


@router.patch("/{listing_id}", response_model=APIResponse[ListingResponse])
async def update_listing(
    listing_id: int,
    data: ListingUpdate,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = ListingService(db)
    listing = await service.update(listing_id, current_user.user_id, data)
    return APIResponse(message="Listing updated successfully", data=_listing_to_response(listing))


@router.delete("/{listing_id}", response_model=APIResponse)
async def delete_listing(
    listing_id: int,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = ListingService(db)
    await service.delete(listing_id, current_user.user_id)
    return APIResponse(message="Listing deleted successfully")


@router.post("/{listing_id}/favorite", response_model=APIResponse[dict])
async def toggle_favorite(
    listing_id: int,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    fav_service = FavoriteService(db)
    listing_service = ListingService(db)
    await listing_service.get_by_id(listing_id)
    is_favorited = await fav_service.toggle(current_user.user_id, listing_id)
    return APIResponse(
        message="Added to favorites" if is_favorited else "Removed from favorites",
        data={"is_favorited": is_favorited},
    )


@router.post("/{listing_id}/submit-for-verification", response_model=APIResponse[ListingResponse])
async def submit_for_verification(
    listing_id: int,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = ListingService(db)
    listing = await service.submit_for_verification(listing_id, current_user.user_id)
    return APIResponse(
        message="Listing submitted for verification",
        data=_listing_to_response(listing),
    )

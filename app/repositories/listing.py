from typing import Optional
from sqlalchemy import select, func, or_, and_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.listing import Listing, ListingStatus, PropertyType, VerificationStatus
from app.repositories.base import BaseRepository

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    import math

    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2.0) ** 2
    )
    return EARTH_RADIUS_KM * 2.0 * math.asin(math.sqrt(a))


class ListingRepository(BaseRepository[Listing]):
    def __init__(self, db: AsyncSession):
        super().__init__(Listing, db)

    def _apply_filters(
        self,
        query,
        q: Optional[str] = None,
        category_id: Optional[int] = None,
        subcategory_id: Optional[int] = None,
        city_id: Optional[int] = None,
        district_id: Optional[int] = None,
        price_min: Optional[float] = None,
        price_max: Optional[float] = None,
        price_unit: Optional[str] = None,
        status: Optional[ListingStatus] = None,
        is_verified: Optional[bool] = None,
        verification_status: Optional[VerificationStatus] = None,
        property_type: Optional[PropertyType] = None,
        rooms_min: Optional[int] = None,
        rooms_max: Optional[int] = None,
        bathrooms_min: Optional[int] = None,
        furnished: Optional[bool] = None,
        parking: Optional[bool] = None,
        wifi_included: Optional[bool] = None,
        available: Optional[bool] = None,
    ):
        if status is not None:
            query = query.where(Listing.status == status)
        else:
            query = query.where(Listing.status == ListingStatus.ACTIVE)

        if q:
            search_term = f"%{q}%"
            query = query.where(
                or_(
                    Listing.title.ilike(search_term),
                    Listing.description.ilike(search_term),
                    Listing.address.ilike(search_term),
                )
            )
        if category_id is not None:
            query = query.where(Listing.category_id == category_id)
        if subcategory_id is not None:
            query = query.where(Listing.subcategory_id == subcategory_id)
        if city_id is not None:
            query = query.where(Listing.city_id == city_id)
        if district_id is not None:
            query = query.where(Listing.district_id == district_id)
        if price_min is not None:
            query = query.where(Listing.price >= price_min)
        if price_max is not None:
            query = query.where(Listing.price <= price_max)
        if price_unit is not None:
            query = query.where(Listing.price_unit == price_unit)
        if is_verified is not None:
            query = query.where(Listing.is_verified == is_verified)
        if verification_status is not None:
            query = query.where(Listing.verification_status == verification_status)
        if property_type is not None:
            query = query.where(Listing.property_type == property_type)
        if rooms_min is not None:
            query = query.where(Listing.rooms >= rooms_min)
        if rooms_max is not None:
            query = query.where(Listing.rooms <= rooms_max)
        if bathrooms_min is not None:
            query = query.where(Listing.bathrooms >= bathrooms_min)
        if furnished is not None:
            query = query.where(Listing.furnished == furnished)
        if parking is not None:
            query = query.where(Listing.parking == parking)
        if wifi_included is not None:
            query = query.where(Listing.wifi_included == wifi_included)
        if available is not None:
            query = query.where(Listing.available == available)

        return query

    def _apply_sort(self, query, sort_by: Optional[str]):
        if sort_by == "price_asc":
            return query.order_by(asc(Listing.price))
        if sort_by == "price_desc":
            return query.order_by(desc(Listing.price))
        if sort_by == "rating":
            return query.order_by(desc(Listing.rating_sum / func.nullif(Listing.rating_count, 0)))
        if sort_by == "views":
            return query.order_by(desc(Listing.views_count))
        return query.order_by(desc(Listing.created_at))

    async def search(
        self,
        q: Optional[str] = None,
        category_id: Optional[int] = None,
        subcategory_id: Optional[int] = None,
        city_id: Optional[int] = None,
        district_id: Optional[int] = None,
        price_min: Optional[float] = None,
        price_max: Optional[float] = None,
        price_unit: Optional[str] = None,
        status: Optional[ListingStatus] = None,
        is_verified: Optional[bool] = None,
        verification_status: Optional[VerificationStatus] = None,
        property_type: Optional[PropertyType] = None,
        rooms_min: Optional[int] = None,
        rooms_max: Optional[int] = None,
        bathrooms_min: Optional[int] = None,
        furnished: Optional[bool] = None,
        parking: Optional[bool] = None,
        wifi_included: Optional[bool] = None,
        available: Optional[bool] = None,
        sort_by: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Listing]:
        query = self._apply_filters(
            select(Listing),
            q,
            category_id,
            subcategory_id,
            city_id,
            district_id,
            price_min,
            price_max,
            price_unit,
            status,
            is_verified,
            verification_status,
            property_type,
            rooms_min,
            rooms_max,
            bathrooms_min,
            furnished,
            parking,
            wifi_included,
            available,
        )
        query = self._apply_sort(query, sort_by)
        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_filtered(
        self,
        q: Optional[str] = None,
        category_id: Optional[int] = None,
        subcategory_id: Optional[int] = None,
        city_id: Optional[int] = None,
        district_id: Optional[int] = None,
        price_min: Optional[float] = None,
        price_max: Optional[float] = None,
        price_unit: Optional[str] = None,
        status: Optional[ListingStatus] = None,
        is_verified: Optional[bool] = None,
        verification_status: Optional[VerificationStatus] = None,
        property_type: Optional[PropertyType] = None,
        rooms_min: Optional[int] = None,
        rooms_max: Optional[int] = None,
        bathrooms_min: Optional[int] = None,
        furnished: Optional[bool] = None,
        parking: Optional[bool] = None,
        wifi_included: Optional[bool] = None,
        available: Optional[bool] = None,
    ) -> int:
        query = self._apply_filters(
            select(func.count()).select_from(Listing),
            q,
            category_id,
            subcategory_id,
            city_id,
            district_id,
            price_min,
            price_max,
            price_unit,
            status,
            is_verified,
            verification_status,
            property_type,
            rooms_min,
            rooms_max,
            bathrooms_min,
            furnished,
            parking,
            wifi_included,
            available,
        )
        result = await self.db.execute(query)
        return result.scalar_one()

    async def nearby(
        self,
        latitude: float,
        longitude: float,
        radius_km: float,
        q: Optional[str] = None,
        category_id: Optional[int] = None,
        subcategory_id: Optional[int] = None,
        city_id: Optional[int] = None,
        district_id: Optional[int] = None,
        price_min: Optional[float] = None,
        price_max: Optional[float] = None,
        price_unit: Optional[str] = None,
        status: Optional[ListingStatus] = None,
        is_verified: Optional[bool] = None,
        verification_status: Optional[VerificationStatus] = None,
        property_type: Optional[PropertyType] = None,
        rooms_min: Optional[int] = None,
        rooms_max: Optional[int] = None,
        bathrooms_min: Optional[int] = None,
        furnished: Optional[bool] = None,
        parking: Optional[bool] = None,
        wifi_included: Optional[bool] = None,
        available: Optional[bool] = None,
        sort_by: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Listing]:
        import math

        delta_lat = radius_km / 111.0
        delta_lon = radius_km / (111.0 * max(1.0, math.cos(math.radians(latitude))))

        query = self._apply_filters(
            select(Listing),
            q,
            category_id,
            subcategory_id,
            city_id,
            district_id,
            price_min,
            price_max,
            price_unit,
            status,
            is_verified,
            verification_status,
            property_type,
            rooms_min,
            rooms_max,
            bathrooms_min,
            furnished,
            parking,
            wifi_included,
            available,
        )
        query = query.where(
            Listing.latitude.isnot(None),
            Listing.longitude.isnot(None),
            Listing.latitude >= latitude - delta_lat,
            Listing.latitude <= latitude + delta_lat,
            Listing.longitude >= longitude - delta_lon,
            Listing.longitude <= longitude + delta_lon,
        )

        result = await self.db.execute(query)
        listings = list(result.scalars().all())

        for item in listings:
            item.distance_km = round(
                haversine_km(latitude, longitude, float(item.latitude), float(item.longitude)),
                2,
            )

        listings = [item for item in listings if item.distance_km <= radius_km]

        if sort_by == "price_asc":
            listings.sort(key=lambda item: float(item.price))
        elif sort_by == "price_desc":
            listings.sort(key=lambda item: float(item.price), reverse=True)
        elif sort_by == "rating":
            listings.sort(key=lambda item: item.average_rating, reverse=True)
        else:
            listings.sort(key=lambda item: item.distance_km)

        return listings[skip:skip + limit]

    async def has_active_booking(
        self,
        listing_id: int,
        start_date: object,
        end_date: object,
        exclude_request_id: Optional[int] = None,
    ) -> bool:
        from app.models.rental_request import RentalRequest
        from app.core.enums import RentalRequestStatus

        query = select(func.count()).select_from(RentalRequest).where(
            RentalRequest.listing_id == listing_id,
            RentalRequest.status == RentalRequestStatus.ACCEPTED,
            RentalRequest.start_date <= end_date,
            RentalRequest.end_date >= start_date,
        )
        if exclude_request_id is not None:
            query = query.where(RentalRequest.id != exclude_request_id)
        result = await self.db.execute(query)
        return result.scalar_one() > 0

    async def get_by_owner(self, owner_id: int, skip: int = 0, limit: int = 20) -> list[Listing]:
        query = (
            select(Listing)
            .where(Listing.owner_id == owner_id)
            .order_by(desc(Listing.created_at))
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_by_owner(self, owner_id: int) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Listing).where(Listing.owner_id == owner_id)
        )
        return result.scalar_one()

    async def increment_views(self, listing: Listing) -> None:
        listing.views_count += 1
        await self.db.flush()
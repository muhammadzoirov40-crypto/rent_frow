from typing import Optional
from sqlalchemy import select, func, or_, and_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.listing import Listing, ListingStatus
from app.models.listing_image import ListingImage
from app.repositories.base import BaseRepository


class ListingRepository(BaseRepository[Listing]):
    def __init__(self, db: AsyncSession):
        super().__init__(Listing, db)

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
        sort_by: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Listing]:
        query = select(Listing)

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

        if sort_by == "price_asc":
            query = query.order_by(asc(Listing.price))
        elif sort_by == "price_desc":
            query = query.order_by(desc(Listing.price))
        elif sort_by == "rating":
            query = query.order_by(desc(Listing.rating_sum / func.nullif(Listing.rating_count, 0)))
        else:
            query = query.order_by(desc(Listing.created_at))

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
    ) -> int:
        query = select(func.count()).select_from(Listing)

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

        result = await self.db.execute(query)
        return result.scalar_one()

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

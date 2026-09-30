from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import Float, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.enums import ListingStatus
from app.models.city import City
from app.models.listing import Listing
from app.models.user import User
from app.schemas.base import APIResponse

router = APIRouter(prefix="/stats", tags=["Public stats"])


class PublicStats(BaseModel):
    listings: int
    users: int
    cities: int
    avg_rating: float


@router.get("", response_model=APIResponse[PublicStats])
async def get_public_stats(db: AsyncSession = Depends(get_db)):
    listings_count = (
        await db.scalar(
            select(func.count())
            .select_from(Listing)
            .where(Listing.status == ListingStatus.ACTIVE)
        )
    ) or 0
    users_count = await db.scalar(select(func.count()).select_from(User)) or 0
    cities_count = await db.scalar(select(func.count()).select_from(City)) or 0
    avg_rating = await db.scalar(
        select(func.avg(func.cast(Listing.rating_sum, Float) / Listing.rating_count)).where(
            Listing.rating_count > 0
        )
    )
    return APIResponse(
        data=PublicStats(
            listings=int(listings_count),
            users=int(users_count),
            cities=int(cities_count),
            avg_rating=round(float(avg_rating or 0), 1),
        )
    )

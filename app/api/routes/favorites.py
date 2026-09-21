from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_auth, CurrentUser
from app.schemas.favorite import FavoriteResponse
from app.schemas.listing import ListingListResponse
from app.schemas.base import PaginatedResponse
from app.services.favorite import FavoriteService

router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.get("", response_model=PaginatedResponse[ListingListResponse])
async def get_my_favorites(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = FavoriteService(db)
    skip = (page - 1) * page_size
    favorites, total = await service.get_user_favorites(current_user.user_id, skip, page_size)

    from app.services.listing import ListingService
    listing_service = ListingService(db)
    items = []
    for fav in favorites:
        listing = await listing_service.get_by_id(fav.listing_id)
        from app.api.routes.listings import _listing_to_list_response
        items.append(_listing_to_list_response(listing, is_favorited=True))

    return PaginatedResponse(
        data=items,
        total=total,
        page=page,
        page_size=page_size,
    )

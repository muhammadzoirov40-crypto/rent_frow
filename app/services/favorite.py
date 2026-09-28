from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.favorite import Favorite
from app.repositories.favorite import FavoriteRepository
from app.repositories.listing import ListingRepository
from app.repositories.user import UserRepository
from app.services.notification import NotificationService


class FavoriteService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = FavoriteRepository(db)
        self.listing_repo = ListingRepository(db)
        self.user_repo = UserRepository(db)
        self.notif_service = NotificationService(db)

    async def toggle(self, user_id: int, listing_id: int) -> bool:
        existing = await self.repo.get_by_user_and_listing(user_id, listing_id)
        if existing:
            await self.repo.delete(existing)
            return False
        else:
            await self.repo.create(user_id=user_id, listing_id=listing_id)

            listing = await self.listing_repo.get_by_id(listing_id)
            if listing and listing.owner_id != user_id:
                liker = await self.user_repo.get_by_id(user_id)
                liker_name = ""
                if liker:
                    liker_name = liker.display_name or (liker.email or "").split("@")[0]
                fav_text = (
                    f"{liker_name} added '{listing.title}' to favorites"
                    if liker_name
                    else f"Your listing '{listing.title}' was added to favorites"
                )
                await self.notif_service.create(
                    user_id=listing.owner_id,
                    title="New Favorite",
                    message=fav_text,
                    type="new_favorite",
                    reference_id=listing_id,
                    reference_type="listing",
                    data={
                        "actor_id": user_id,
                        "actor_name": liker_name,
                        "listing_id": listing.id,
                        "listing_title": listing.title,
                    },
                )
            return True

    async def get_user_favorites(self, user_id: int, skip: int = 0, limit: int = 20) -> tuple[list[Favorite], int]:
        favorites = await self.repo.get_user_favorites(user_id, skip, limit)
        total = await self.repo.count_user_favorites(user_id)
        return favorites, total

    async def is_favorited(self, user_id: int, listing_id: int) -> bool:
        return await self.repo.is_favorited(user_id, listing_id)

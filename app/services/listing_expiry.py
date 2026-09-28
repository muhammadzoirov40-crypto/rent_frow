import asyncio
import logging
from datetime import datetime

from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.listing import Listing, ListingStatus
from app.services.notification import NotificationService

logger = logging.getLogger("rentflow.expiry")

CHECK_INTERVAL_SECONDS = 3600
FIRST_RUN_DELAY_SECONDS = 60


async def expire_listings(session_factory=None) -> int:
    """Marks overdue active listings as EXPIRED and notifies their owners."""
    factory = session_factory or async_session_factory
    async with factory() as db:
        result = await db.execute(
            select(Listing).where(
                Listing.status == ListingStatus.ACTIVE,
                Listing.expires_at.isnot(None),
                Listing.expires_at < datetime.utcnow(),
            )
        )
        listings = list(result.scalars().all())
        notif = NotificationService(db)
        for listing in listings:
            listing.status = ListingStatus.EXPIRED
            await notif.create(
                user_id=listing.owner_id,
                title="Listing Expired",
                message=f"The listing period for '{listing.title}' has expired. Renew it to show up in search again.",
                type="listing_expired",
                reference_id=listing.id,
                reference_type="listing",
                data={
                    "listing_id": listing.id,
                    "listing_title": listing.title,
                },
            )
        await db.commit()
    if listings:
        logger.info("Expired %d listings", len(listings))
    return len(listings)


async def run_expiry_loop() -> None:
    await asyncio.sleep(FIRST_RUN_DELAY_SECONDS)
    while True:
        try:
            await expire_listings()
        except Exception:
            logger.exception("Listing expiry check failed")
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)

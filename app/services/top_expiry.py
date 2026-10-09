"""Server-side expiry of paid TOP windows.

Expiry must happen even when the owner never opens the site and the browser
is closed, so it lives in this in-process asyncio loop (same proven pattern
as `listing_expiry` / `rental_expiry` - no Celery in this service). Every
60s it flips ACTIVE rows whose `expires_at` has passed to EXPIRED: one
UPDATE, the listing untouched, the row kept as history, no re-charge ever.

The read paths *also* filter `expires_at > now`, so this loop is a
belt-and-braces cleaner, not the only guard: a window cannot be shown past
its expiry even in the second before the loop ticks.
"""

import asyncio
import logging

from app.services.promotion import expire_due

logger = logging.getLogger("rentflow.top_expiry")

CHECK_INTERVAL_SECONDS = 60  # one minute - short enough that a badge never lingers long
FIRST_RUN_DELAY_SECONDS = 45  # let the API finish booting first


async def check_top_expiry() -> int:
    """Expire due promotions in their own session (committed by the service)."""
    from app.core.database import async_session_factory

    async with async_session_factory() as db:
        return await expire_due(db)


async def run_top_expiry_loop() -> None:
    print(f"[top-expiry] loop started (every {CHECK_INTERVAL_SECONDS}s)", flush=True)
    await asyncio.sleep(FIRST_RUN_DELAY_SECONDS)
    while True:
        try:
            expired = await check_top_expiry()
            if expired:
                print(f"[top-expiry] expired {expired} promotion(s)", flush=True)
        except Exception:
            logger.exception("TOP expiry check failed")
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)

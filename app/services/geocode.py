"""Forward geocoding of listing addresses via Nominatim (OpenStreetMap).

The map already renders OpenStreetMap tiles, so the matching, key-free
geocoder is Nominatim - one HTTP call turns "wohmansur, Сино, Душанбе" into a
latitude/longitude pair.  The pair is written straight onto the listing row,
which makes the call a once-per-listing affair: the database is the cache and
Nominatim never hears about the same listing twice.

It runs as a FastAPI background task, after the page's response has been sent,
so a slow or unreachable geocoder can never hold up a page load: the visitor
sees the city-centre pin they saw before, and the real one from the next view
on.  The database transaction is closed *before* that round-trip is made -
SQLite would otherwise hold a read lock across it and time out every view
counter bump on the site.  Everything is best effort - timeout, HTTP error,
empty answer all resolve to None and the city-centre fallback stays exactly as
it was.  Queries that came back empty are remembered for the life of the
process, so a listing with an unmatchable address is not re-asked on every
single view.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Optional, Protocol

from fastapi import BackgroundTasks
from httpx import AsyncClient
from sqlalchemy import select

from app.core import database as _database
from app.core.config import get_settings
from app.models.city import City

logger = logging.getLogger("rentflow.geocode")


# A listing row is handed around as an ORM object; only what this module
# needs from it is declared, so the core routine is testable with a stub.
class _ListingLike(Protocol):
    id: int
    latitude: Optional[float]
    longitude: Optional[float]
    address: Optional[str]
    city_rel: Optional[object]


# Remembered so an unmatchable address is not re-sent on every view.  Bounded:
# past the cap the set simply starts over rather than growing forever.
_FAILED_QUERIES: set[str] = set()
_MAX_FAILED_QUERIES = 1000

# Throttle state: Nominatim's usage policy allows one request per second.
# Module-level because the limit is per client, not per listing.
_last_request_at = 0.0


async def _fetch(query: str) -> Optional[dict]:
    """One throttled HTTP round-trip; the first hit as a plain dict.

    Split out so tests can stub it.  The raw display name travels along so the
    pin picker can show what was actually found.
    """
    settings = get_settings()
    global _last_request_at
    wait = settings.GEOCODER_MIN_INTERVAL_SECONDS - (time.monotonic() - _last_request_at)
    if wait > 0:
        await asyncio.sleep(wait)
    _last_request_at = time.monotonic()
    try:
        async with AsyncClient(
            timeout=settings.GEOCODER_TIMEOUT_SECONDS,
            headers={"User-Agent": settings.GEOCODER_USER_AGENT},
        ) as client:
            response = await client.get(
                settings.GEOCODER_URL,
                params={"q": query, "format": "jsonv2", "limit": 1},
                headers={"Accept-Language": "tg,ru,en;q=0.7"},
            )
            response.raise_for_status()
            rows = response.json()
    except Exception as exc:  # noqa: BLE001 - any failure means "no coordinates"
        logger.warning("geocoder request failed for %r: %s", query, exc)
        return None
    if not rows:
        return None
    try:
        lat, lon = float(rows[0]["lat"]), float(rows[0]["lon"])
    except (KeyError, TypeError, ValueError):
        return None
    if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
        return None
    return {
        "latitude": lat,
        "longitude": lon,
        "label": str(rows[0].get("display_name") or query),
    }


async def _resolve(query: str) -> Optional[dict]:
    """The shared gate every lookup passes through: enabled, plausible, not
    known to come back empty - then exactly one throttled round-trip."""
    settings = get_settings()
    if not settings.GEOCODE_ENABLED:
        return None
    query = (query or "").strip()
    # Below this it is a street/city fragment, not an address worth a call.
    if len(query) < 4 or query in _FAILED_QUERIES:
        return None
    hit = await _fetch(query)
    if hit is None:
        if len(_FAILED_QUERIES) >= _MAX_FAILED_QUERIES:
            _FAILED_QUERIES.clear()
        _FAILED_QUERIES.add(query)
    return hit


async def geocode(query: str) -> Optional[tuple[float, float]]:
    """Resolve a free-text place query to coordinates, or None."""
    hit = await _resolve(query)
    return (hit["latitude"], hit["longitude"]) if hit else None


async def geocode_search(query: str) -> Optional[dict]:
    """The same lookup for the pin picker: coordinates plus what was found."""
    return await _resolve(query)


async def ensure_listing_coordinates(db, listing: _ListingLike) -> bool:
    """Give a listing real coordinates if it has none and an address to try.

    Returns True when coordinates were found and saved to the row.  Never
    raises: a broken geocoder must not take a page (or a task) down with it.
    """
    settings = get_settings()
    if not settings.GEOCODE_ENABLED:
        return False
    if listing.latitude is not None and listing.longitude is not None:
        return False
    address = (listing.address or "").strip()
    # A bare city name is what the fallback already shows; geocoding it would
    # merely dress the same city-centre pin up as an exact one.
    if len(address) < 4:
        return False
    # Captured while the object is still live: after the rollback below it is
    # expired, and reading an attribute off an expired row in async code is a
    # synchronous load - which the greenlet underneath refuses to do.
    listing_id = listing.id
    # Read the city through its own awaited lookup, never through the ORM
    # relationship: touching a not-yet-loaded lazy relation fires a *sync*
    # load, which is illegal (MissingGreenlet) on an async session.
    city_obj = await db.get(City, listing.city_id) if listing.city_id is not None else None
    city = city_obj.name if city_obj is not None else None

    # Everything the query needs is in local variables now, so the transaction
    # can go before the network is reached.  SQLite keeps this session's shared
    # lock for the whole round-trip, and a page view writes on every request
    # (the view counter), so a geocoder call made inside an open transaction
    # parks every writer behind it until the driver gives up with "database is
    # locked" - the page the visitor is already on would 500 waiting for the
    # geocoder of the *previous* one.
    try:
        await db.rollback()
    except Exception:  # noqa: BLE001 - releasing early is best effort too
        pass

    query = f"{address}, {city}" if city else address
    hit = await geocode(query)

    # The rollback above left the caller's row expired.  Every way out that
    # returns to it therefore re-reads the row first: an expired attribute
    # touched from async code would try to reload itself synchronously, which
    # the greenlet underneath refuses.  This also re-checks the owner's pin -
    # if one was dropped while the geocoder was being asked, theirs wins.
    try:
        await db.refresh(listing)
    except Exception as exc:  # noqa: BLE001 - the row is gone, nothing to save
        logger.warning("could not re-read listing %s after geocoding: %s", listing_id, exc)
        return False

    if hit is None:
        return False
    if listing.latitude is not None and listing.longitude is not None:
        return False
    listing.latitude = round(hit[0], 6)
    listing.longitude = round(hit[1], 6)
    try:
        await db.commit()
    except Exception as exc:  # noqa: BLE001 - saving must never break the read
        logger.warning("could not save geocoded coordinates for listing %s: %s", listing_id, exc)
        await db.rollback()
        return False
    return True


async def geocode_listing_task(listing_id: int) -> None:
    """Background task: re-read the row in its own session and resolve it.

    The row is re-read rather than passed in - the request's session is closed
    by the time this runs, and a second reader also means a concurrent task
    for the same listing simply finds the coordinates already there.  The
    session factory is touched as an attribute at call time (not imported by
    name) so tests can point it at their own database.
    """
    from app.models.listing import Listing

    try:
        async with _database.async_session_factory() as session:
            listing = await session.get(Listing, listing_id)
            if listing is None:
                return
            await ensure_listing_coordinates(session, listing)
    except Exception as exc:  # noqa: BLE001 - a task must never bubble errors
        logger.warning("geocode task for listing %s failed: %s", listing_id, exc)


def schedule_geocode(background_tasks: BackgroundTasks, listing: _ListingLike) -> None:
    """Queue the post-response geocode for a listing that may need one.

    Cheap pre-checks (geocoder off, no/short address) skip the queue outright,
    so a switched-off geocoder costs nothing beyond this one comparison.
    """
    if not get_settings().GEOCODE_ENABLED:
        return
    # An exact pin (from the owner, or an earlier run) means there is nothing
    # left to look up - don't queue a task that would only re-read the row.
    if listing.latitude is not None and listing.longitude is not None:
        return
    address = (listing.address or "").strip()
    if len(address) < 4:
        return
    background_tasks.add_task(geocode_listing_task, listing.id)

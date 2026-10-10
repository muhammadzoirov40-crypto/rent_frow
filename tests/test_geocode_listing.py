"""Making a listing's map pin real.

A listing whose owner typed a street address but never dropped a pin used to
show the city centre forever, with a note apologising for it.  These tests pin
down the fix: the first time somebody opens the listing we ask Nominatim for
the address in a background task, store the coordinates on the row, and every
view from then on shows the real building.  The lookup never blocks the page,
and it is strictly best-effort - a listing that cannot be resolved keeps its
city-centre fallback exactly as before.

The geocoder is switched off for the whole suite (see conftest); only these
tests turn it back on, and even then `_fetch` is stubbed so nothing reaches the
network.  The persistence behaviour is exercised directly against one session
(`ensure_listing_coordinates`), because the production background task opens a
*second* database connection - which SQLite serialises into a lock, while the
PostgreSQL deployment runs them concurrently just fine.  The end-to-end test
separately asserts that opening a listing actually schedules that task.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.category import Category
from app.models.city import City
from app.models.listing import Listing
from app.services import geocode

# A fixed, unambiguous answer standing in for Nominatim's real response.
PLACE = (38.562614, 68.789111)


@pytest.fixture(autouse=True)
def _clean_geocode_state():
    """The geocoder keeps a module-level failure cache and a rate-limit clock;
    isolate every test so neither can leak into the next one."""
    geocode._FAILED_QUERIES.clear()
    geocode._last_request_at = 0.0
    yield
    geocode._FAILED_QUERIES.clear()
    geocode._last_request_at = 0.0


async def _make_listing(
    db: AsyncSession,
    owner_id: int,
    address: str | None = "Рӯдакӣ 45, Душанбе",
    latitude=None,
    longitude=None,
    city_latitude=None,
    city_longitude=None,
) -> Listing:
    tag = uuid.uuid4().hex[:6]
    city = City(name=f"Ҷойгиршавӣ-{tag}", latitude=city_latitude, longitude=city_longitude)
    category = Category(name=f"Категория-{tag}")
    db.add_all([city, category])
    await db.flush()

    listing = Listing(
        owner_id=owner_id,
        category_id=category.id,
        city_id=city.id,
        title=f"Эълон-{tag}",
        price=100,
        address=address,
        latitude=latitude,
        longitude=longitude,
    )
    db.add(listing)
    await db.commit()
    return listing


def _stub_fetch(monkeypatch, answer=PLACE, calls=None):
    """Replace the one HTTP round-trip with a recorder.

    ``answer`` may be given as the (lat, lon) tuple the tests think in; the
    real ``_fetch`` returns the geocoder's raw row, so tuples are wrapped.
    """
    calls = [] if calls is None else calls
    if isinstance(answer, tuple):
        answer = {"latitude": answer[0], "longitude": answer[1], "label": "stub place"}

    async def fake_fetch(query: str):
        calls.append(query)
        return answer

    monkeypatch.setattr(geocode, "_fetch", fake_fetch)
    return calls


# ---------------------------------------------------------------------------
# opening a listing schedules the lookup, and never waits for it
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_opening_a_listing_schedules_the_geocode_task(
    customer_client: AsyncClient,
    customer_id: int,
    db_session: AsyncSession,
    monkeypatch,
):
    listing = await _make_listing(db_session, customer_id)
    ran = []

    async def spy_task(listing_id: int):
        ran.append(listing_id)

    monkeypatch.setattr(geocode, "geocode_listing_task", spy_task)
    monkeypatch.setattr(get_settings(), "GEOCODE_ENABLED", True)

    resp = await customer_client.get(f"/api/v1/listings/{listing.id}")
    assert resp.status_code == 200, resp.text
    # The page answered without waiting, and the background lookup ran for
    # exactly this listing.
    assert ran == [listing.id]


@pytest.mark.asyncio
async def test_a_listing_with_no_address_never_schedules_a_task(
    customer_client: AsyncClient,
    customer_id: int,
    db_session: AsyncSession,
    monkeypatch,
):
    listing = await _make_listing(db_session, customer_id, address=None)
    ran = []

    async def spy_task(listing_id: int):
        ran.append(listing_id)

    monkeypatch.setattr(geocode, "geocode_listing_task", spy_task)
    monkeypatch.setattr(get_settings(), "GEOCODE_ENABLED", True)

    resp = await customer_client.get(f"/api/v1/listings/{listing.id}")
    assert resp.status_code == 200
    assert ran == []


# ---------------------------------------------------------------------------
# the lookup itself: resolve once, then keep the pin on the row
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_it_geocodes_the_address_once_and_keeps_the_result(
    customer_id: int,
    db_session: AsyncSession,
    monkeypatch,
):
    listing = await _make_listing(db_session, customer_id)
    calls = _stub_fetch(monkeypatch)
    monkeypatch.setattr(get_settings(), "GEOCODE_ENABLED", True)

    assert await geocode.ensure_listing_coordinates(db_session, listing) is True
    assert float(listing.latitude) == pytest.approx(PLACE[0])
    assert float(listing.longitude) == pytest.approx(PLACE[1])
    assert len(calls) == 1

    # ...so a second pass has nothing left to do and never calls out again.
    # (NUMERIC columns come back from the database as Decimal, hence float().)
    await db_session.refresh(listing)
    assert float(listing.latitude) == pytest.approx(PLACE[0])

    assert await geocode.ensure_listing_coordinates(db_session, listing) is False
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_the_query_combines_the_address_and_the_city(
    customer_id: int,
    db_session: AsyncSession,
    monkeypatch,
):
    listing = await _make_listing(db_session, customer_id, address="Рӯдакӣ 45")
    calls = _stub_fetch(monkeypatch)
    monkeypatch.setattr(get_settings(), "GEOCODE_ENABLED", True)

    await geocode.ensure_listing_coordinates(db_session, listing)

    # The city is appended so Nominatim disambiguates a common street name.
    assert calls and calls[0].startswith("Рӯдакӣ 45, ")


# ---------------------------------------------------------------------------
# who is never geocoded
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_a_listing_with_an_exact_pin_is_left_alone(
    customer_id: int,
    db_session: AsyncSession,
    monkeypatch,
):
    listing = await _make_listing(
        db_session, customer_id, latitude=38.5501, longitude=68.7802
    )
    calls = _stub_fetch(monkeypatch)
    monkeypatch.setattr(get_settings(), "GEOCODE_ENABLED", True)

    assert await geocode.ensure_listing_coordinates(db_session, listing) is False
    # The owner's own pin wins and is never overwritten.
    assert listing.latitude == pytest.approx(38.5501)
    assert calls == []


@pytest.mark.asyncio
async def test_a_listing_with_no_address_is_left_alone(
    customer_id: int,
    db_session: AsyncSession,
    monkeypatch,
):
    listing = await _make_listing(db_session, customer_id, address=None)
    calls = _stub_fetch(monkeypatch)
    monkeypatch.setattr(get_settings(), "GEOCODE_ENABLED", True)

    assert await geocode.ensure_listing_coordinates(db_session, listing) is False
    assert listing.latitude is None
    assert calls == []


@pytest.mark.asyncio
async def test_with_the_geocoder_off_nothing_is_ever_looked_up(
    customer_id: int,
    db_session: AsyncSession,
    monkeypatch,
):
    listing = await _make_listing(db_session, customer_id)
    calls = _stub_fetch(monkeypatch)
    # GEOCODE_ENABLED stays at its suite default of False.

    assert await geocode.ensure_listing_coordinates(db_session, listing) is False
    assert listing.latitude is None
    assert calls == []


# ---------------------------------------------------------------------------
# best effort: a lookup that goes wrong changes nothing and is not re-asked
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_a_failed_lookup_is_graceful_and_not_retried(
    customer_id: int,
    db_session: AsyncSession,
    monkeypatch,
):
    listing = await _make_listing(db_session, customer_id)
    calls = _stub_fetch(monkeypatch, answer=None)
    monkeypatch.setattr(get_settings(), "GEOCODE_ENABLED", True)

    # Nothing raises, and the pin stays exactly where it was.
    assert await geocode.ensure_listing_coordinates(db_session, listing) is False
    assert listing.latitude is None

    # An address that came back empty is remembered, not re-asked every view.
    assert await geocode.ensure_listing_coordinates(db_session, listing) is False
    assert len(calls) == 1


# ---------------------------------------------------------------------------
# the search endpoint behind the form's pin picker
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_geocode_search_needs_a_signed_in_user(client: AsyncClient):
    resp = await client.get("/api/v1/geocode/search", params={"q": "Рӯдакӣ 45, Душанбе"})
    assert resp.status_code == 401, resp.text


@pytest.mark.asyncio
async def test_geocode_search_answers_with_the_first_hit(
    customer_client: AsyncClient, monkeypatch
):
    found = {"latitude": 38.562614, "longitude": 68.789111, "label": "Рӯдакӣ 45, Душанбе"}
    calls = _stub_fetch(monkeypatch, answer=found)
    monkeypatch.setattr(get_settings(), "GEOCODE_ENABLED", True)

    resp = await customer_client.get("/api/v1/geocode/search", params={"q": "Рӯдакӣ 45, Душанбе"})
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["latitude"] == pytest.approx(38.562614)
    assert data["longitude"] == pytest.approx(68.789111)
    assert data["label"] == "Рӯдакӣ 45, Душанбе"
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_geocode_search_reports_a_miss_as_null_data(
    customer_client: AsyncClient, monkeypatch
):
    _stub_fetch(monkeypatch, answer=None)
    monkeypatch.setattr(get_settings(), "GEOCODE_ENABLED", True)

    # "wohmansur" is exactly the kind of local name no geocoder knows; the
    # form turns null into "click the map instead", so it is not an error.
    resp = await customer_client.get("/api/v1/geocode/search", params={"q": "wohmansur, Душанбе"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"] is None


@pytest.mark.asyncio
async def test_geocode_search_rejects_a_too_short_query(customer_client: AsyncClient):
    resp = await customer_client.get("/api/v1/geocode/search", params={"q": "ab"})
    assert resp.status_code == 422, resp.text


# ---------------------------------------------------------------------------
# the owner drops the pin no geocoder could find
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_the_owner_can_set_the_exact_pin(
    customer_client: AsyncClient,
    customer_id: int,
    db_session: AsyncSession,
):
    listing = await _make_listing(db_session, customer_id, address="wohmansur")

    resp = await customer_client.patch(
        f"/api/v1/listings/{listing.id}",
        json={"latitude": 38.5739, "longitude": 68.7901},
    )
    assert resp.status_code == 200, resp.text
    assert float(resp.json()["data"]["latitude"]) == pytest.approx(38.5739)

    # The next view shows it as an exact location - the note the map used to
    # apologise with is gone for good.
    detail = await customer_client.get(f"/api/v1/listings/{listing.id}")
    assert detail.status_code == 200
    assert float(detail.json()["data"]["latitude"]) == pytest.approx(38.5739)
    assert float(detail.json()["data"]["longitude"]) == pytest.approx(68.7901)


@pytest.mark.asyncio
async def test_nobody_else_may_move_the_pin(
    customer_id: int,
    db_session: AsyncSession,
):
    from datetime import datetime as dt, timedelta as td

    from httpx import ASGITransport
    from jose import jwt

    from app.core.enums import UserRole
    from app.main import app as app_obj
    from conftest import _ensure_user

    listing = await _make_listing(db_session, customer_id)

    _, stranger_ext = await _ensure_user("pin-stranger@rentflow.com", UserRole.CUSTOMER)
    token = jwt.encode(
        {"sub": stranger_ext, "role": UserRole.CUSTOMER.value, "exp": dt.utcnow() + td(hours=1)},
        get_settings().JWT_SECRET_KEY,
        algorithm=get_settings().JWT_ALGORITHM,
    )
    transport = ASGITransport(app=app_obj)
    async with AsyncClient(transport=transport, base_url="http://test") as stranger:
        stranger.headers["Authorization"] = f"Bearer {token}"
        resp = await stranger.patch(
            f"/api/v1/listings/{listing.id}",
            json={"latitude": 1.0, "longitude": 1.0},
        )
    assert resp.status_code == 403, resp.text

    # The pin the owner had is untouched.
    await db_session.refresh(listing)
    assert listing.latitude is None

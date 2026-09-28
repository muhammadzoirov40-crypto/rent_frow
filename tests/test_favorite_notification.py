import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_favorite_sends_notification_to_owner(
    admin_client: AsyncClient, customer_client: AsyncClient
):
    cat = await admin_client.post(
        "/api/v1/categories", json={"name": f"Cat-{uuid.uuid4().hex[:6]}"}
    )
    assert cat.status_code == 200
    category_id = cat.json()["data"]["id"]

    from conftest import TestSessionLocal
    from app.models.city import City

    async with TestSessionLocal() as session:
        city = City(name=f"City-{uuid.uuid4().hex[:6]}")
        session.add(city)
        await session.flush()
        city_id = city.id
        await session.commit()

    listing_payload = {
        "category_id": category_id,
        "city_id": city_id,
        "title": "Favorite notification test listing",
        "price": 100,
        "price_unit": "per_day",
    }
    created = await admin_client.post("/api/v1/listings", json=listing_payload)
    assert created.status_code == 200, created.text
    listing_id = created.json()["data"]["id"]

    fav = await customer_client.post(f"/api/v1/listings/{listing_id}/favorite")
    assert fav.status_code == 200, fav.text
    assert fav.json()["data"]["is_favorited"] is True

    notifs = await admin_client.get("/api/v1/notifications")
    assert notifs.status_code == 200
    owner_items = [n for n in notifs.json()["data"] if n["type"] == "new_favorite"]
    assert len(owner_items) == 1
    assert "Favorite notification test listing" in owner_items[0]["message"]

    # removing the favorite must NOT create another notification
    fav_off = await customer_client.post(f"/api/v1/listings/{listing_id}/favorite")
    assert fav_off.status_code == 200
    assert fav_off.json()["data"]["is_favorited"] is False
    notifs_after = await customer_client.get("/api/v1/notifications")
    assert notifs_after.status_code == 200
    assert notifs_after.json()["data"] == []

    notifs_owner_after = await admin_client.get("/api/v1/notifications")
    owner_items_after = [
        n for n in notifs_owner_after.json()["data"] if n["type"] == "new_favorite"
    ]
    assert len(owner_items_after) == 1


@pytest.mark.asyncio
async def test_favorite_own_listing_creates_no_notification(
    admin_client: AsyncClient, customer_client: AsyncClient
):
    cat = await admin_client.post(
        "/api/v1/categories", json={"name": f"Cat-{uuid.uuid4().hex[:6]}"}
    )
    category_id = cat.json()["data"]["id"]

    from conftest import TestSessionLocal
    from app.models.city import City

    async with TestSessionLocal() as session:
        city = City(name=f"City-{uuid.uuid4().hex[:6]}")
        session.add(city)
        await session.flush()
        city_id = city.id
        await session.commit()

    created = await admin_client.post(
        "/api/v1/listings",
        json={
            "category_id": category_id,
            "city_id": city_id,
            "title": "Own listing favorite test",
            "price": 50,
            "price_unit": "per_day",
        },
    )
    assert created.status_code == 200, created.text
    listing_id = created.json()["data"]["id"]

    fav = await admin_client.post(f"/api/v1/listings/{listing_id}/favorite")
    assert fav.status_code == 200
    assert fav.json()["data"]["is_favorited"] is True

    notifs = await admin_client.get("/api/v1/notifications")
    assert notifs.status_code == 200
    assert [n for n in notifs.json()["data"] if n["type"] == "new_favorite"] == []

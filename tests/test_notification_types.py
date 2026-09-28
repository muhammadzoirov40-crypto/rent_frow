import uuid
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient


async def _make_listing(client: AsyncClient, title: str) -> int:
    cat = await client.post(
        "/api/v1/categories", json={"name": f"Cat-{uuid.uuid4().hex[:6]}"}
    )
    assert cat.status_code == 200, cat.text
    category_id = cat.json()["data"]["id"]

    from conftest import TestSessionLocal
    from app.models.city import City

    async with TestSessionLocal() as session:
        city = City(name=f"City-{uuid.uuid4().hex[:6]}")
        session.add(city)
        await session.flush()
        city_id = city.id
        await session.commit()

    created = await client.post(
        "/api/v1/listings",
        json={
            "category_id": category_id,
            "city_id": city_id,
            "title": title,
            "price": 100,
            "price_unit": "per_day",
        },
    )
    assert created.status_code == 200, created.text
    return created.json()["data"]["id"]


async def _notifications(client: AsyncClient, type_: str) -> list[dict]:
    resp = await client.get("/api/v1/notifications", params={"page_size": 100})
    assert resp.status_code == 200, resp.text
    return [n for n in resp.json()["data"] if n["type"] == type_]


async def _get_user_id(email: str) -> int:
    from conftest import TestSessionLocal
    from sqlalchemy import select
    from app.models.user import User

    async with TestSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        return result.scalar_one().id


@pytest.mark.asyncio
async def test_rental_request_and_accept_notifications(
    admin_client: AsyncClient, customer_client: AsyncClient
):
    listing_title = f"Rental notif listing {uuid.uuid4().hex[:6]}"
    listing_id = await _make_listing(admin_client, listing_title)

    today = datetime.utcnow().date()
    req = await customer_client.post(
        "/api/v1/rental-requests",
        json={
            "listing_id": listing_id,
            "start_date": str(today + timedelta(days=1)),
            "end_date": str(today + timedelta(days=3)),
            "message": "Хочу арендовать на 3 дня",
        },
    )
    assert req.status_code == 200, req.text
    request_id = req.json()["data"]["id"]

    owner_notifs = await _notifications(admin_client, "rental_request")
    assert len(owner_notifs) == 1
    data = owner_notifs[0]["data"]
    assert data["listing_title"] == listing_title
    assert data["listing_id"] == listing_id
    assert data["request_message"] == "Хочу арендовать на 3 дня"
    assert data["actor_id"]  # who made the request

    accept = await admin_client.patch(f"/api/v1/rental-requests/{request_id}/accept")
    assert accept.status_code == 200, accept.text

    renter_notifs = await _notifications(customer_client, "rental_accepted")
    assert len(renter_notifs) == 1
    assert renter_notifs[0]["data"]["listing_title"] == listing_title


@pytest.mark.asyncio
async def test_message_notification_has_sender_and_preview(
    admin_client: AsyncClient, customer_client: AsyncClient
):
    admin_id = await _get_user_id("test_admin@rentflow.com")

    conv = await customer_client.post(
        "/api/v1/messages/conversations", json={"user_id": admin_id}
    )
    assert conv.status_code == 200, conv.text
    conversation_id = conv.json()["data"]["id"]

    text = "Здравствуйте, это объявление ещё доступно?"
    sent = await customer_client.post(
        f"/api/v1/messages/conversations/{conversation_id}", json={"content": text}
    )
    assert sent.status_code == 200, sent.text

    notifs = await _notifications(admin_client, "new_message")
    assert len(notifs) == 1
    data = notifs[0]["data"]
    assert data["message_preview"].startswith("Здравствуйте")
    assert data["conversation_id"] == conversation_id
    assert "actor_name" in data


@pytest.mark.asyncio
async def test_comment_notification_to_post_author(
    admin_client: AsyncClient, customer_client: AsyncClient
):
    post = await admin_client.post(
        "/api/v1/posts",
        json={"title": "Post for comments", "content": "Original post content"},
    )
    assert post.status_code == 200, post.text
    post_id = post.json()["data"]["id"]

    comment_text = "Цена окончательная?"
    resp = await customer_client.post(
        f"/api/v1/posts/{post_id}/comments", json={"content": comment_text}
    )
    assert resp.status_code == 200, resp.text

    notifs = await _notifications(admin_client, "new_comment")
    assert len(notifs) == 1
    data = notifs[0]["data"]
    assert data["comment"] == comment_text
    assert data["post_id"] == post_id
    assert notifs[0]["reference_type"] == "post"

    # commenting on your own post must not notify yourself
    own = await admin_client.post(
        f"/api/v1/posts/{post_id}/comments", json={"content": "my own reply"}
    )
    assert own.status_code == 200, own.text
    assert len(await _notifications(admin_client, "new_comment")) == 1


@pytest.mark.asyncio
async def test_admin_approve_and_reject_notifications(admin_client: AsyncClient):
    approved_title = f"Approve me {uuid.uuid4().hex[:6]}"
    approved_id = await _make_listing(admin_client, approved_title)
    resp = await admin_client.put(f"/api/v1/admin/listings/{approved_id}/approve")
    assert resp.status_code == 200, resp.text

    approved = await _notifications(admin_client, "listing_approved")
    assert len(approved) == 1
    assert approved[0]["data"]["listing_title"] == approved_title

    rejected_title = f"Reject me {uuid.uuid4().hex[:6]}"
    rejected_id = await _make_listing(admin_client, rejected_title)
    resp = await admin_client.put(
        f"/api/v1/admin/listings/{rejected_id}/reject",
        params={"reason": "Плохое качество фото"},
    )
    assert resp.status_code == 200, resp.text

    rejected = await _notifications(admin_client, "listing_rejected")
    assert len(rejected) == 1
    assert rejected[0]["data"]["listing_title"] == rejected_title
    assert rejected[0]["data"]["reason"] == "Плохое качество фото"


@pytest.mark.asyncio
async def test_owner_deactivation_sends_notification(admin_client: AsyncClient):
    title = f"Deactivate me {uuid.uuid4().hex[:6]}"
    listing_id = await _make_listing(admin_client, title)

    resp = await admin_client.patch(
        f"/api/v1/listings/{listing_id}",         json={"status": "PAUSED"}
    )
    assert resp.status_code == 200, resp.text

    notifs = await _notifications(admin_client, "listing_deactivated")
    assert len(notifs) == 1
    assert notifs[0]["data"]["listing_title"] == title


@pytest.mark.asyncio
async def test_expired_listing_notifies_owner(admin_client: AsyncClient):
    title = f"Expire me {uuid.uuid4().hex[:6]}"
    listing_id = await _make_listing(admin_client, title)

    from conftest import TestSessionLocal
    from sqlalchemy import select
    from app.models.listing import Listing, ListingStatus

    async with TestSessionLocal() as session:
        listing = (
            await session.execute(select(Listing).where(Listing.id == listing_id))
        ).scalar_one()
        listing.expires_at = datetime.utcnow() - timedelta(hours=1)
        await session.commit()

    from app.services.listing_expiry import expire_listings
    from conftest import TestSessionLocal as SessionFactory

    expired_count = await expire_listings(SessionFactory)
    assert expired_count == 1

    async with TestSessionLocal() as session:
        listing = (
            await session.execute(select(Listing).where(Listing.id == listing_id))
        ).scalar_one()
        assert listing.status == ListingStatus.EXPIRED

    notifs = await _notifications(admin_client, "listing_expired")
    assert len(notifs) == 1
    assert notifs[0]["data"]["listing_title"] == title


@pytest.mark.asyncio
async def test_review_notification_contains_rating(
    admin_client: AsyncClient, customer_client: AsyncClient
):
    title = f"Review me {uuid.uuid4().hex[:6]}"
    listing_id = await _make_listing(admin_client, title)

    today = datetime.utcnow().date()
    req = await customer_client.post(
        "/api/v1/rental-requests",
        json={
            "listing_id": listing_id,
            "start_date": str(today + timedelta(days=1)),
            "end_date": str(today + timedelta(days=4)),
            "message": "rent for review test",
        },
    )
    assert req.status_code == 200, req.text
    request_id = req.json()["data"]["id"]

    accept = await admin_client.patch(f"/api/v1/rental-requests/{request_id}/accept")
    assert accept.status_code == 200, accept.text
    complete = await admin_client.patch(f"/api/v1/rental-requests/{request_id}/complete")
    assert complete.status_code == 200, complete.text

    review = await customer_client.post(
        f"/api/v1/listings/{listing_id}/reviews",
        json={"rating": 5, "comment": "Отличный товар!"},
    )
    assert review.status_code == 200, review.text

    notifs = await _notifications(admin_client, "new_review")
    assert len(notifs) == 1
    data = notifs[0]["data"]
    assert data["rating"] == 5
    assert data["comment"] == "Отличный товар!"
    assert data["listing_title"] == title
    assert notifs[0]["reference_type"] == "listing"

"""Buying a TOP plan through DC Wallet (Dushanbe City).

Two ids leave the browser and the price never does: the checkout link is
built server-side from the plan row, and the money moves exactly once -
through the same idempotent settle a balance top-up uses, so the webhook
(or an operator confirming the reference by hand, which is all production
has until DC City registers the callback) activates the promotion once and
the wallet is never touched.

 18. the link carries the plan's price, this user, and a fresh reference
 19. opening the checkout moves no money - and the admin hears the price
 20. reopening the checkout hands back the very same link
 21. the callback activates the window exactly once, wallet untouched
 22. the wrong amount settles nothing; the right one still can
 23. an operator can close it by hand - admin only, exactly once
 24. one open request per listing: next plan 409, live window 409
 25. every guard: free plan, disabled plan, paused listing, stranger,
     visitor, and the switch itself - none of them leaves a row behind
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from conftest import TestSessionLocal, _ensure_user
from app.core.enums import (
    ListingStatus,
    TopPromotionPayment,
    TopPromotionStatus,
    UserRole,
)
from app.models.category import Category
from app.models.city import City
from app.models.listing import Listing
from app.models.notification import Notification
from app.models.promotion import TopPlan, TopPromotion
from app.models.wallet import TopupIntent, WalletTransaction

from tests.test_topup_flow import SECRET, _Settings, _callback

API = "/api/v1/promotions"
WALLET = "/api/v1/wallet"


# ------------------------------------------------------------------ helpers
async def _seed_plan(
    price: float = 40,
    active: bool = True,
    duration_key: str = "1d",
    name: str = "DC plan",
) -> int:
    async with TestSessionLocal() as s:
        plan = TopPlan(
            name=name,
            duration_key=duration_key,
            price=price,
            is_active=active,
        )
        s.add(plan)
        await s.flush()
        plan_id = plan.id
        await s.commit()
        return plan_id


async def _seed_listing(owner_id: int, status: ListingStatus = ListingStatus.ACTIVE) -> int:
    import uuid as _uuid

    tag = _uuid.uuid4().hex[:6]
    async with TestSessionLocal() as s:
        category = Category(name=f"DcCat-{tag}")
        city = City(name=f"DcCity-{tag}")
        s.add_all([category, city])
        await s.flush()
        listing = Listing(
            owner_id=owner_id,
            category_id=category.id,
            city_id=city.id,
            title="Promotable listing",
            price=100,
            status=status,
        )
        s.add(listing)
        await s.flush()
        listing_id = listing.id
        await s.commit()
        return listing_id


async def _open_dc(client: AsyncClient, listing_id: int, plan_id: int):
    return await client.post(
        f"{API}/pay-dc", json={"listing_id": listing_id, "plan_id": plan_id}
    )


async def _balance_of(user_id: int) -> float:
    from app.services.wallet import WalletService

    async with TestSessionLocal() as s:
        summary = await WalletService(s).summary(user_id)
        return float(summary["balance"])


async def _promo_rows(**filters) -> list[TopPromotion]:
    async with TestSessionLocal() as s:
        stmt = select(TopPromotion)
        for key, value in filters.items():
            stmt = stmt.where(getattr(TopPromotion, key) == value)
        return list((await s.execute(stmt)).scalars().all())


async def _intents(promotion_id: int | None = None) -> list[TopupIntent]:
    async with TestSessionLocal() as s:
        stmt = select(TopupIntent)
        if promotion_id is not None:
            stmt = stmt.where(TopupIntent.promotion_id == promotion_id)
        return list((await s.execute(stmt)).scalars().all())


async def _ledger_ids(user_id: int) -> list[int]:
    async with TestSessionLocal() as s:
        rows = await s.execute(
            select(WalletTransaction.id)
            .where(WalletTransaction.user_id == user_id)
            .order_by(WalletTransaction.id)
        )
        return list(rows.scalars().all())


async def _notif(user_id: int, ntype: str) -> list[Notification]:
    async with TestSessionLocal() as s:
        rows = await s.execute(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.type == ntype,
            )
        )
        return list(rows.scalars().all())


# --------------------------------------------------- 18 + 19: the link itself
async def test_the_link_carries_the_plan_price_and_nothing_moves(
    customer_client: AsyncClient, customer_id: int
):
    admin_id, _ = await _ensure_user("test_admin@rentflow.com", UserRole.ADMIN)
    plan_id = await _seed_plan(price=40)
    listing_id = await _seed_listing(customer_id)
    before = await _balance_of(customer_id)

    resp = await _open_dc(customer_client, listing_id, plan_id)
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]

    promo = data["promotion"]
    assert promo["status"] == "PENDING"
    assert promo["payment_status"] == "UNPAID"
    assert float(promo["price"]) == 40.0
    assert promo["plan_name"] == "DC plan"

    ref = data["reference"]
    url = data["url"]
    assert url.startswith("https://pay.dc.tj/?a=")
    assert "s=40.00" in url
    assert "f2=%d" % customer_id in url
    assert url.split("f3=")[-1] == ref

    # one waiting row, bound to this promotion; the wallet is not in it
    intents = await _intents(promo["id"])
    assert len(intents) == 1
    assert intents[0].status == "PENDING"
    assert float(intents[0].amount) == 40.0
    assert intents[0].user_id == customer_id
    assert await _balance_of(customer_id) == before

    # ...and the admin hears about the request with the price in the message
    notes = await _notif(admin_id, "top_request")
    assert any("DC Wallet" in n.message and "40" in n.message for n in notes), [
        n.message for n in notes
    ]


# --------------------------------------------------- 20: reopening is free
async def test_reopening_hands_back_the_same_link(
    customer_client: AsyncClient, customer_id: int
):
    plan_id = await _seed_plan(price=40)
    listing_id = await _seed_listing(customer_id)

    first = (await _open_dc(customer_client, listing_id, plan_id)).json()["data"]
    second = await _open_dc(customer_client, listing_id, plan_id)
    assert second.status_code == 200, second.text
    again = second.json()["data"]

    assert again["reference"] == first["reference"]
    assert again["url"] == first["url"]

    # still one promotion and one waiting row behind them
    promos = await _promo_rows(listing_id=listing_id)
    assert len(promos) == 1
    assert len(await _intents(promos[0].id)) == 1


# --------------------------------------------------- 21: the callback
async def test_the_callback_activates_the_window_exactly_once(
    customer_client: AsyncClient, customer_id: int
):
    plan_id = await _seed_plan(price=40, duration_key="1d")
    listing_id = await _seed_listing(customer_id)
    before = await _balance_of(customer_id)
    before_rows = await _ledger_ids(customer_id)

    data = (await _open_dc(customer_client, listing_id, plan_id)).json()["data"]
    ref = data["reference"]

    with _Settings(PAYDC_WEBHOOK_SECRET=SECRET):
        first = await _callback(customer_client, secret=SECRET, f3=ref, s="40.00")
    assert first["credited"] is True, first
    assert first["reason"] == "PROMOTION_ACTIVATED", first

    promo = (await _promo_rows(listing_id=listing_id))[0]
    assert promo.status == TopPromotionStatus.ACTIVE
    assert promo.payment_status == TopPromotionPayment.PAID
    assert promo.started_at is not None
    assert promo.expires_at is not None
    started = promo.started_at

    # the money bought a window, not a balance - the ledger never moved
    assert await _balance_of(customer_id) == before
    assert await _ledger_ids(customer_id) == before_rows

    intents = await _intents(promo.id)
    assert intents[0].status == "PAID"
    assert intents[0].paid_at is not None

    # the provider retries: the window keeps its start, nothing re-activates
    with _Settings(PAYDC_WEBHOOK_SECRET=SECRET):
        again = await _callback(customer_client, secret=SECRET, f3=ref, s="40.00")
    assert again["credited"] is False, again
    assert again["reason"] == "ALREADY_PAID", again
    promo_after = (await _promo_rows(listing_id=listing_id))[0]
    assert promo_after.started_at == started

    # the owner is told the window is live
    assert await _notif(customer_id, "top_activated") != []


# --------------------------------------------------- 22: amount is checked
async def test_the_wrong_amount_settles_nothing_and_the_right_one_still_can(
    customer_client: AsyncClient, customer_id: int
):
    plan_id = await _seed_plan(price=40)
    listing_id = await _seed_listing(customer_id)
    data = (await _open_dc(customer_client, listing_id, plan_id)).json()["data"]

    with _Settings(PAYDC_WEBHOOK_SECRET=SECRET):
        wrong = await _callback(customer_client, secret=SECRET, f3=data["reference"], s="400.00")
    assert wrong["credited"] is False, wrong
    assert wrong["reason"] == "AMOUNT_MISMATCH", wrong

    promo = (await _promo_rows(listing_id=listing_id))[0]
    assert promo.status == TopPromotionStatus.PENDING
    assert promo.payment_status == TopPromotionPayment.UNPAID
    assert (await _intents(promo.id))[0].status == "PENDING"

    # the mismatch left it pending, so the real amount still settles it
    with _Settings(PAYDC_WEBHOOK_SECRET=SECRET):
        right = await _callback(customer_client, secret=SECRET, f3=data["reference"], s="40.00")
    assert right["credited"] is True, right
    assert right["reason"] == "PROMOTION_ACTIVATED", right


# --------------------------------------------------- 23: by hand, once
async def test_an_operator_can_close_it_by_hand_exactly_once(
    customer_client: AsyncClient, admin_client: AsyncClient, customer_id: int
):
    plan_id = await _seed_plan(price=40)
    listing_id = await _seed_listing(customer_id)
    before = await _balance_of(customer_id)
    data = (await _open_dc(customer_client, listing_id, plan_id)).json()["data"]
    ref = data["reference"]

    # a customer must never be able to stamp their own payment as paid
    denied = await customer_client.post(f"{WALLET}/topups/{ref}/confirm")
    assert denied.status_code == 403, denied.text

    first = await admin_client.post(f"{WALLET}/topups/{ref}/confirm")
    assert first.status_code == 200, first.text
    assert first.json()["message"] == "PROMOTION_ACTIVATED"
    assert first.json()["data"]["status"] == "PAID"

    promo = (await _promo_rows(listing_id=listing_id))[0]
    assert promo.status == TopPromotionStatus.ACTIVE
    assert promo.payment_status == TopPromotionPayment.PAID
    # the payment bought a window - it never reached the balance
    assert await _balance_of(customer_id) == before

    # the operator clicks twice, or the callback turns up later: once only
    again = await admin_client.post(f"{WALLET}/topups/{ref}/confirm")
    assert again.status_code == 200, again.text
    assert again.json()["message"] == "ALREADY_PAID"
    assert await _balance_of(customer_id) == before


# --------------------------------------------------- 24: one open request
async def test_only_one_open_request_per_listing(
    customer_client: AsyncClient, customer_id: int
):
    plan_a = await _seed_plan(price=40, name="Plan A")
    plan_b = await _seed_plan(price=60, duration_key="1w", name="Plan B")
    listing_id = await _seed_listing(customer_id)

    first = await _open_dc(customer_client, listing_id, plan_a)
    assert first.status_code == 200, first.text

    # another plan cannot jump the queue behind a pending one
    second = await _open_dc(customer_client, listing_id, plan_b)
    assert second.status_code == 409, second.text
    assert second.json()["detail"] == "PROMOTION_EXISTS"

    # pay it, and the live window is not for sale either
    ref = first.json()["data"]["reference"]
    with _Settings(PAYDC_WEBHOOK_SECRET=SECRET):
        settled = await _callback(customer_client, secret=SECRET, f3=ref, s="40.00")
    assert settled["credited"] is True, settled

    third = await _open_dc(customer_client, listing_id, plan_a)
    assert third.status_code == 409, third.text
    assert third.json()["detail"] == "PROMOTION_EXISTS"
    assert len(await _promo_rows(listing_id=listing_id)) == 1


# --------------------------------------------------- 25: the guards
async def test_every_guard_refuses_and_leaves_no_row_behind(
    customer_client: AsyncClient, customer_id: int, client: AsyncClient
):
    active_listing = await _seed_listing(customer_id)
    paused_listing = await _seed_listing(customer_id, status=ListingStatus.PAUSED)
    free_plan = await _seed_plan(price=0, name="Free")
    off_plan = await _seed_plan(price=30, active=False, name="Off")
    good_plan = await _seed_plan(price=40, name="Good")

    # a free plan has nothing to collect: the normal path activates it free
    resp = await _open_dc(customer_client, active_listing, free_plan)
    assert resp.status_code == 400 and resp.json()["detail"] == "FREE_PLAN", resp.text

    resp = await _open_dc(customer_client, active_listing, off_plan)
    assert resp.status_code == 400 and resp.json()["detail"] == "PLAN_DISABLED", resp.text

    resp = await _open_dc(customer_client, paused_listing, good_plan)
    assert resp.status_code == 400 and resp.json()["detail"] == "LISTING_NOT_ACTIVE", resp.text

    # someone else's listing: the backend keeps its owner-only rule even
    # though the button itself is visible to every viewer
    _, stranger_ext = await _ensure_user("stranger_dc@rentflow.com", UserRole.OWNER)
    from datetime import datetime as dt, timedelta as td

    from jose import jwt

    from app.core.config import get_settings
    from app.main import app as app_obj
    from httpx import ASGITransport

    token = jwt.encode(
        {"sub": stranger_ext, "role": UserRole.OWNER.value, "exp": dt.utcnow() + td(hours=1)},
        get_settings().JWT_SECRET_KEY,
        algorithm=get_settings().JWT_ALGORITHM,
    )
    transport = ASGITransport(app=app_obj)
    async with AsyncClient(transport=transport, base_url="http://test") as intruder:
        intruder.headers["Authorization"] = f"Bearer {token}"
        resp = await _open_dc(intruder, active_listing, good_plan)
    assert resp.status_code == 403, resp.text

    # a visitor is sent to the login first
    resp = await _open_dc(client, active_listing, good_plan)
    assert resp.status_code in (401, 403), resp.text

    # and the provider switch itself
    with _Settings(PAYDC_ENABLED=False):
        resp = await _open_dc(customer_client, active_listing, good_plan)
    assert resp.status_code == 400 and resp.json()["detail"] == "TOPUP_DISABLED", resp.text

    # not one of the refusals may leave an open request behind
    assert await _promo_rows(listing_id=active_listing) == []
    assert await _promo_rows(listing_id=paused_listing) == []
    assert await _intents() == []

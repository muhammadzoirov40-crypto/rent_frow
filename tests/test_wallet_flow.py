"""The rental flow end to end: money, chat, email and notifications.

Covers the six cases the product is judged on:

    1. sufficient balance    -> the request goes through and TOTAL is held
    2. insufficient balance -> the request is refused, nothing is written
    3. owner accepts        -> renter notified (in-app + email + chat)
    4. owner rejects        -> same, plus the hold is given back
    5. completion           -> the hold is settled and leaves the wallet
    6. cancellation         -> the hold is released / refunded

The backend decides every amount; these tests only read what it reports.
"""

import uuid
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient

from app.core.config import get_settings

START = float(get_settings().WALLET_STARTING_BALANCE)
SYSTEM_PREFIX = "[system]"


async def _make_listing(client: AsyncClient, title: str, price: int = 100) -> int:
    cat = await client.post(
        "/api/v1/categories", json={"name": f"Cat-{uuid.uuid4().hex[:6]}"}
    )
    assert cat.status_code == 200, cat.text

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
            "category_id": cat.json()["data"]["id"],
            "city_id": city_id,
            "title": title,
            "price": price,
            "price_unit": "per_day",
        },
    )
    assert created.status_code == 200, created.text
    return created.json()["data"]["id"]


def _dates(days: int = 1) -> tuple[str, str]:
    start = datetime.utcnow().date() + timedelta(days=1)
    return start.isoformat(), (start + timedelta(days=days)).isoformat()


async def _create_request(client: AsyncClient, listing_id: int, days: int = 1) -> int:
    start, end = _dates(days)
    resp = await client.post(
        "/api/v1/rental-requests",
        json={"listing_id": listing_id, "start_date": start, "end_date": end},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["id"]


async def _wallet(client: AsyncClient) -> dict:
    resp = await client.get("/api/v1/wallet")
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    return {k: float(v) for k, v in data.items() if k in ("balance", "held", "total")}


async def _transactions(client: AsyncClient) -> list[dict]:
    resp = await client.get("/api/v1/wallet/transactions", params={"page_size": 50})
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]


async def _notifications(client: AsyncClient, type_: str) -> list[dict]:
    resp = await client.get("/api/v1/notifications", params={"page_size": 100})
    assert resp.status_code == 200, resp.text
    return [n for n in resp.json()["data"] if n["type"] == type_]


async def _chat(client: AsyncClient) -> tuple[dict, list[dict]]:
    """The request's conversation and its messages, in order."""
    convs = await client.get("/api/v1/messages/conversations")
    assert convs.status_code == 200, convs.text
    conv = next(c for c in convs.json()["data"] if c.get("rental_request_id"))
    msgs = await client.get(
        f"/api/v1/messages/conversations/{conv['id']}", params={"page_size": 100}
    )
    assert msgs.status_code == 200, msgs.text
    return conv, msgs.json()["data"]


def _capture_emails(monkeypatch) -> list[tuple[str, str]]:
    """Never let a test reach an SMTP server; record who would have been mailed."""
    from app.services import email as email_service

    sent: list[tuple[str, str]] = []

    def _fake(to, template):
        sent.append((to, template[0]))
        return False

    monkeypatch.setattr(email_service, "send_in_background", _fake)
    return sent


# ---------------------------------------------------------------- case 1
@pytest.mark.asyncio
async def test_case1_sufficient_balance_holds_total(
    admin_client: AsyncClient, customer_client: AsyncClient
):
    listing_id = await _make_listing(admin_client, f"Case1 {uuid.uuid4().hex[:6]}", price=100)

    before = await _wallet(customer_client)
    assert before["balance"] == START

    await _create_request(customer_client, listing_id, days=2)  # 100 x 2 = 200

    after = await _wallet(customer_client)
    assert after["balance"] == START - 200, after
    assert after["held"] == 200, after
    assert after["total"] == START, after

    txs = await _transactions(customer_client)
    assert txs[0]["type"] == "HELD"
    assert float(txs[0]["amount"]) == -200.0
    assert float(txs[0]["held_amount"]) == 200.0
    assert txs[0]["listing_title"], "the ledger should name the listing"


# ---------------------------------------------------------------- case 2
@pytest.mark.asyncio
async def test_case2_insufficient_balance_blocks_request(
    admin_client: AsyncClient, customer_client: AsyncClient
):
    listing_id = await _make_listing(
        admin_client, f"Case2 {uuid.uuid4().hex[:6]}", price=int(START * 10)
    )
    before = await _wallet(customer_client)

    start, end = _dates(1)
    resp = await customer_client.post(
        "/api/v1/rental-requests",
        json={"listing_id": listing_id, "start_date": start, "end_date": end},
    )
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "INSUFFICIENT_BALANCE"

    # nothing may have been written
    assert await _wallet(customer_client) == before
    mine = await customer_client.get("/api/v1/rental-requests/my")
    assert mine.json()["total"] == 0
    assert await _transactions(customer_client) == []


# ---------------------------------------------------------------- case 3
@pytest.mark.asyncio
async def test_case3_owner_accepts_notifies_email_and_chat(
    monkeypatch, admin_client: AsyncClient, customer_client: AsyncClient
):
    sent = _capture_emails(monkeypatch)
    title = f"Case3 {uuid.uuid4().hex[:6]}"
    listing_id = await _make_listing(admin_client, title, price=100)
    request_id = await _create_request(customer_client, listing_id, days=1)

    # the owner was mailed about the new request, the renter about their own
    assert any(subj.startswith("Новый запрос на аренду") for _, subj in sent), sent
    assert any(subj.startswith("Ваш запрос на аренду отправлен") for _, subj in sent), sent
    owner_notifs = await _notifications(admin_client, "rental_request")
    assert len(owner_notifs) == 1

    # the chat exists, is tied to the request and carries a system line
    conv, messages = await _chat(customer_client)
    assert conv["rental_request_id"] == request_id
    system_lines = [m["content"] for m in messages if m["content"].startswith(SYSTEM_PREFIX)]
    assert len(system_lines) == 1
    assert title in system_lines[0]

    # ---- accept
    sent.clear()
    accept = await admin_client.patch(f"/api/v1/rental-requests/{request_id}/accept")
    assert accept.status_code == 200, accept.text
    assert accept.json()["data"]["status"] == "ACCEPTED"

    renter_notifs = await _notifications(customer_client, "rental_accepted")
    assert len(renter_notifs) == 1
    assert any(subj.startswith("Аренда подтверждена") for _, subj in sent), sent

    _, messages = await _chat(customer_client)
    system_lines = [m["content"] for m in messages if m["content"].startswith(SYSTEM_PREFIX)]
    assert len(system_lines) == 2, system_lines

    # accepting keeps the money reserved — it never doubles the hold
    wallet = await _wallet(customer_client)
    assert wallet["held"] == 100.0
    assert wallet["balance"] == START - 100


# ---------------------------------------------------------------- case 4
@pytest.mark.asyncio
async def test_case4_owner_rejects_notifies_and_releases_hold(
    monkeypatch, admin_client: AsyncClient, customer_client: AsyncClient
):
    sent = _capture_emails(monkeypatch)
    title = f"Case4 {uuid.uuid4().hex[:6]}"
    listing_id = await _make_listing(admin_client, title, price=100)
    request_id = await _create_request(customer_client, listing_id, days=3)

    wallet = await _wallet(customer_client)
    assert wallet["held"] == 300.0

    sent.clear()
    reject = await admin_client.patch(f"/api/v1/rental-requests/{request_id}/reject")
    assert reject.status_code == 200, reject.text
    assert reject.json()["data"]["status"] == "REJECTED"

    renter_notifs = await _notifications(customer_client, "rental_rejected")
    assert len(renter_notifs) == 1
    assert any(subj.startswith("Запрос на аренду отклонён") for _, subj in sent), sent

    _, messages = await _chat(customer_client)
    system_lines = [m["content"] for m in messages if m["content"].startswith(SYSTEM_PREFIX)]
    assert len(system_lines) == 2, system_lines
    assert "declined" in system_lines[-1]

    after = await _wallet(customer_client)
    assert after["balance"] == START, after
    assert after["held"] == 0.0, after
    txs = await _transactions(customer_client)
    assert txs[0]["type"] == "RELEASED"


# ---------------------------------------------------------------- case 5
@pytest.mark.asyncio
async def test_case5_completion_settles_the_hold(
    admin_client: AsyncClient, customer_client: AsyncClient
):
    listing_id = await _make_listing(admin_client, f"Case5 {uuid.uuid4().hex[:6]}", price=100)
    request_id = await _create_request(customer_client, listing_id, days=2)

    assert (await admin_client.patch(f"/api/v1/rental-requests/{request_id}/accept")).status_code == 200
    complete = await admin_client.patch(f"/api/v1/rental-requests/{request_id}/complete")
    assert complete.status_code == 200, complete.text
    assert complete.json()["data"]["status"] == "COMPLETED"

    after = await _wallet(customer_client)
    # the reserved rent is consumed: it leaves the wallet, it is not returned
    assert after["held"] == 0.0, after
    assert after["balance"] == START - 200, after
    assert after["total"] == START - 200, after

    txs = await _transactions(customer_client)
    assert txs[0]["type"] == "COMPLETED"
    assert float(txs[0]["held_amount"]) == -200.0


# ---------------------------------------------------------------- case 6
@pytest.mark.asyncio
async def test_case6_cancellation_releases_the_hold(
    admin_client: AsyncClient, customer_client: AsyncClient
):
    listing_id = await _make_listing(admin_client, f"Case6 {uuid.uuid4().hex[:6]}", price=100)
    request_id = await _create_request(customer_client, listing_id, days=2)
    assert (await admin_client.patch(f"/api/v1/rental-requests/{request_id}/accept")).status_code == 200

    cancel = await customer_client.patch(f"/api/v1/rental-requests/{request_id}/cancel")
    assert cancel.status_code == 200, cancel.text
    assert cancel.json()["data"]["status"] == "CANCELLED"

    after = await _wallet(customer_client)
    assert after["balance"] == START, after
    assert after["held"] == 0.0, after
    txs = await _transactions(customer_client)
    assert txs[0]["type"] == "RELEASED"


# ------------------------------------------------- refund after real money
@pytest.mark.asyncio
async def test_money_already_collected_is_refunded_not_released(
    admin_client: AsyncClient, customer_client: AsyncClient
):
    """A cancellation after the owner confirmed the rent must give the money
    back as REFUNDED — the rent was really taken, not merely held."""
    listing_id = await _make_listing(admin_client, f"Refund {uuid.uuid4().hex[:6]}", price=100)
    request_id = await _create_request(customer_client, listing_id, days=1)
    assert (await admin_client.patch(f"/api/v1/rental-requests/{request_id}/accept")).status_code == 200

    payment = await customer_client.post(
        "/api/v1/payments",
        json={"rental_request_id": request_id, "payment_type": "BOOKING"},
    )
    assert payment.status_code == 200, payment.text
    payment_id = payment.json()["data"]["id"]
    confirm = await admin_client.post(f"/api/v1/payments/{payment_id}/confirm")
    assert confirm.status_code == 200, confirm.text

    # the hold is untouched by paying — it is the money the payment draws on
    held = await _wallet(customer_client)
    assert held["held"] == 100.0

    cancel = await customer_client.patch(f"/api/v1/rental-requests/{request_id}/cancel")
    assert cancel.status_code == 200, cancel.text

    txs = await _transactions(customer_client)
    assert txs[0]["type"] == "REFUNDED", txs[0]
    after = await _wallet(customer_client)
    assert after["balance"] == START
    assert after["held"] == 0.0


# ------------------------------------------------- reading / topping up
@pytest.mark.asyncio
async def test_wallet_topup_and_history(customer_client: AsyncClient, customer_id: int):
    topup = await customer_client.post("/api/v1/wallet/topup", json={"amount": 250})
    assert topup.status_code == 200, topup.text
    assert float(topup.json()["data"]["balance"]) == START + 250

    txs = await _transactions(customer_client)
    assert txs[0]["type"] == "TOPUP"
    assert float(txs[0]["amount"]) == 250.0
    assert float(txs[0]["balance_after"]) == START + 250

    bad = await customer_client.post("/api/v1/wallet/topup", json={"amount": -5})
    assert bad.status_code == 422, bad.text


@pytest.mark.asyncio
async def test_wallet_is_private_to_its_owner(
    admin_client: AsyncClient, customer_client: AsyncClient, client: AsyncClient
):
    """Every wallet is its owner's own: the renter's hold never shows up on
    somebody else's balance, and nobody gets in without signing in."""
    listing_id = await _make_listing(admin_client, f"Private {uuid.uuid4().hex[:6]}", price=100)
    await _create_request(customer_client, listing_id, days=2)

    renter = await _wallet(customer_client)
    assert renter["held"] == 200.0

    owner = await _wallet(admin_client)
    assert owner["balance"] == START
    assert owner["held"] == 0.0
    assert await _transactions(admin_client) == []

    anon = await client.get("/api/v1/wallet")
    assert anon.status_code in (401, 403)

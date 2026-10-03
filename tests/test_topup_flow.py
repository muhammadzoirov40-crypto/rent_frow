"""Topping up through DC City: link out, callback in, money once.

The three properties that matter:

* the link is built for *this* user (``f2``) and *this* amount (``s``),
* nothing can be credited without the shared secret,
* a callback credits the ledger exactly once, no matter how it is replayed.
"""

import pytest
from httpx import AsyncClient

from app.core.config import get_settings

START = float(get_settings().WALLET_STARTING_BALANCE)
SECRET = "test-paydc-secret"


class _Settings:
    """Puts the settings singleton into a state and puts it back afterwards —
    the webhook reads ``get_settings()`` at call time, so this is the switch."""

    def __init__(self, **values):
        self.values = values
        self.before = {}

    def __enter__(self):
        settings = get_settings()
        for key, value in self.values.items():
            self.before[key] = getattr(settings, key)
            setattr(settings, key, value)
        return settings

    def __exit__(self, *exc):
        settings = get_settings()
        for key, value in self.before.items():
            setattr(settings, key, value)


async def _balance(client: AsyncClient) -> float:
    resp = await client.get("/api/v1/wallet")
    assert resp.status_code == 200, resp.text
    return float(resp.json()["data"]["balance"])


async def _types(client: AsyncClient) -> list[str]:
    resp = await client.get("/api/v1/wallet/transactions")
    assert resp.status_code == 200, resp.text
    return [row["type"] for row in resp.json()["data"]]


async def _prepare(client: AsyncClient, amount: float) -> dict:
    resp = await client.post("/api/v1/wallet/topup/prepare", json={"amount": amount})
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]


async def _callback(client: AsyncClient, **fields) -> dict:
    resp = await client.post("/api/v1/webhooks/pay-dc", json=fields)
    assert resp.status_code == 200, f"{resp.status_code} {resp.text}"
    return resp.json()


# ------------------------------------------------------------ the link itself
@pytest.mark.asyncio
async def test_prepare_builds_a_link_for_this_user(
    customer_client: AsyncClient, customer_id: int
):
    before = await _balance(customer_client)

    intent = await _prepare(customer_client, 75)

    assert intent["status"] == "PENDING"
    assert float(intent["amount"]) == 75.0
    url = intent["url"]
    # the provider's own parameter order, plus the two free fields we use to
    # say whose payment this is
    assert url.startswith("https://pay.dc.tj/?a=")
    assert "f1=133" in url
    assert "s=75.00" in url
    # f2 = the RentHub user, f3 = the reference this callback must echo back
    assert "f2=%d" % customer_id in url
    assert url.split("f3=")[-1] == intent["reference"]

    # asking for a link is not money
    assert await _balance(customer_client) == before

    rows = await customer_client.get("/api/v1/wallet/topups")
    assert rows.status_code == 200, rows.text
    data = rows.json()["data"]
    assert len(data) == 1
    assert data[0]["status"] == "PENDING"
    assert data[0]["reference"] == intent["reference"]


# ------------------------------------------------------------- the gate first
@pytest.mark.asyncio
async def test_a_callback_without_the_secret_credits_nothing(
    customer_client: AsyncClient,
):
    intent = await _prepare(customer_client, 75)
    body = {"f3": intent["reference"], "s": "75.00"}

    with _Settings(PAYDC_WEBHOOK_SECRET=""):
        missing = await customer_client.post("/api/v1/webhooks/pay-dc", json=body)
        assert missing.status_code == 503, missing.text
        assert missing.json()["detail"] == "WEBHOOK_NOT_CONFIGURED"

    with _Settings(PAYDC_WEBHOOK_SECRET=SECRET):
        no_secret = await customer_client.post("/api/v1/webhooks/pay-dc", json=body)
        assert no_secret.status_code == 403, no_secret.text

        wrong = await customer_client.post(
            "/api/v1/webhooks/pay-dc", json={**body, "secret": "not-the-one"}
        )
        assert wrong.status_code == 403, wrong.text

    assert await _balance(customer_client) == START


# --------------------------------------------------------------- crediting it
@pytest.mark.asyncio
async def test_a_callback_credits_the_wallet_exactly_once(
    customer_client: AsyncClient,
):
    intent = await _prepare(customer_client, 75)
    body = {"secret": SECRET, "f3": intent["reference"], "s": "75.00"}

    with _Settings(PAYDC_WEBHOOK_SECRET=SECRET):
        first = await _callback(customer_client, **body)
        assert first["credited"] is True, first
        assert first["reason"] == "CREDITED"

        assert await _balance(customer_client) == START + 75
        assert (await _types(customer_client))[0] == "TOPUP"

        # the provider retries — that must not print money
        again = await _callback(customer_client, **body)
        assert again["credited"] is False, again
        assert again["reason"] == "ALREADY_PAID"
        assert await _balance(customer_client) == START + 75

        rows = await customer_client.get("/api/v1/wallet/topups")
        paid = rows.json()["data"][0]
        assert paid["status"] == "PAID"
        assert paid["paid_at"] is not None

        # ...and the whole history reads as one top-up, not two
        assert (await _types(customer_client)).count("TOPUP") == 1


@pytest.mark.asyncio
async def test_a_callback_for_another_reference_or_the_wrong_amount_is_refused(
    customer_client: AsyncClient,
):
    intent = await _prepare(customer_client, 75)

    with _Settings(PAYDC_WEBHOOK_SECRET=SECRET):
        stranger = await _callback(
            customer_client, secret=SECRET, f3="NOSUCHREFERENCE", s="75.00"
        )
        assert stranger["credited"] is False
        assert stranger["reason"] == "UNKNOWN_REFERENCE"

        wrong_amount = await _callback(
            customer_client, secret=SECRET, f3=intent["reference"], s="750.00"
        )
        assert wrong_amount["credited"] is False
        assert wrong_amount["reason"] == "AMOUNT_MISMATCH"
        assert await _balance(customer_client) == START

        # the mismatch left it pending, so the real amount still settles it
        settled = await _callback(
            customer_client, secret=SECRET, f3=intent["reference"], s="75.00"
        )
        assert settled["credited"] is True, settled
        assert await _balance(customer_client) == START + 75


# ------------------------------------------------- who may hand out free money
@pytest.mark.asyncio
async def test_a_user_cannot_credit_their_own_balance(customer_client: AsyncClient):
    with _Settings(WALLET_ALLOW_MANUAL_TOPUP=False):
        resp = await customer_client.post("/api/v1/wallet/topup", json={"amount": 9999})
        assert resp.status_code == 403, resp.text
        assert resp.json()["detail"] == "TOPUP_ADMIN_ONLY"
    assert await _balance(customer_client) == START


@pytest.mark.asyncio
async def test_an_admin_can_still_credit_by_hand(admin_client: AsyncClient):
    before = await _balance(admin_client)
    with _Settings(WALLET_ALLOW_MANUAL_TOPUP=False):
        resp = await admin_client.post(
            "/api/v1/wallet/topup", json={"amount": 40, "description": "seeded"}
        )
        assert resp.status_code == 200, resp.text
    assert await _balance(admin_client) == before + 40

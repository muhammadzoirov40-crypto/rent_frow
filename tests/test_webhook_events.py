"""Security and idempotency of the general event webhook.

The contract under test: an unsigned or wrongly-signed request never reads a
row; an unconfigured intake is shut (503), not open; a well-signed event moves
a payment forward exactly once no matter how many times the provider retries;
and a category alias refuses an event from the wrong category.
"""

import hashlib
import hmac

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.core.config import get_settings
from app.core.enums import PaymentStatus, PaymentType
from app.models.payment import Payment

SECRET = "test-webhook-secret"
WEBHOOKS = "/api/v1/webhooks"


def _sign(body: bytes, secret: str = SECRET) -> str:
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


@pytest.fixture
def webhook_secret(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", SECRET, raising=False)
    return SECRET


@pytest.fixture
def secret_off(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", "", raising=False)


@pytest_asyncio.fixture
async def pending_payment(db_session, customer_id) -> Payment:
    payment = Payment(
        booking_id=None,
        rental_request_id=None,
        customer_id=customer_id,
        amount=250.00,
        payment_type=PaymentType.BOOKING,
        status=PaymentStatus.PENDING,
        transaction_id="txn-webhook-test",
    )
    db_session.add(payment)
    await db_session.commit()
    await db_session.refresh(payment)
    return payment


async def test_unconfigured_secret_is_503(client, secret_off):
    body = b'{"event":"payment.succeeded","data":{}}'
    r = await client.post(
        f"{WEBHOOKS}/events",
        content=body,
        headers={"X-RentHub-Signature": _sign(body)},
    )
    assert r.status_code == 503
    assert r.json()["detail"] == "WEBHOOK_NOT_CONFIGURED"


async def test_bad_signature_is_403(client, webhook_secret):
    body = b'{"event":"payment.succeeded","data":{"payment_id":1}}'
    r = await client.post(
        f"{WEBHOOKS}/events",
        content=body,
        headers={"X-RentHub-Signature": _sign(body, "wrong-secret")},
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "BAD_SIGNATURE"


async def test_missing_signature_is_403(client, webhook_secret):
    body = b'{"event":"payment.succeeded","data":{"payment_id":1}}'
    r = await client.post(f"{WEBHOOKS}/events", content=body)
    assert r.status_code == 403


async def test_bearer_token_accepted(client, webhook_secret):
    body = b'{"event":"totally.unknown.event","data":{}}'
    r = await client.post(
        f"{WEBHOOKS}/events",
        content=body,
        headers={"Authorization": f"Bearer {SECRET}"},
    )
    assert r.status_code == 200


async def test_unknown_event_acknowledged_not_retried(client, webhook_secret):
    body = b'{"event":"mars.landing","id":"evt_1","data":{}}'
    r = await client.post(
        f"{WEBHOOKS}/events",
        content=body,
        headers={"X-RentHub-Signature": _sign(body)},
    )
    assert r.status_code == 200
    assert r.json()["handled"] is False


async def test_payment_succeeded_marks_paid(client, webhook_secret, db_session, pending_payment):
    body = (
        '{"event":"payment.succeeded","id":"evt_42",'
        f'"data":{{"payment_id":{pending_payment.id}}}}}'
    ).encode()
    r = await client.post(
        f"{WEBHOOKS}/events",
        content=body,
        headers={"X-RentHub-Signature": _sign(body)},
    )
    assert r.status_code == 200
    assert r.json()["changed"] is True
    assert r.json()["status"] == "PAID"

    await db_session.refresh(pending_payment)
    assert pending_payment.status == PaymentStatus.PAID


async def test_payment_succeeded_is_idempotent(client, webhook_secret, db_session, pending_payment):
    body = (
        '{"event":"payment.succeeded",'
        f'"data":{{"payment_id":{pending_payment.id}}}}}'
    ).encode()
    headers = {"X-RentHub-Signature": _sign(body)}

    first = await client.post(f"{WEBHOOKS}/events", content=body, headers=headers)
    second = await client.post(f"{WEBHOOKS}/events", content=body, headers=headers)

    assert first.status_code == 200 and first.json()["changed"] is True
    assert second.status_code == 200 and second.json()["changed"] is False

    await db_session.refresh(pending_payment)
    assert pending_payment.status == PaymentStatus.PAID


async def test_settled_reference_lookup(client, webhook_secret, db_session, pending_payment):
    # The provider sends the reference we issued, not our internal id.
    body = (
        '{"event":"payment.succeeded",'
        '"data":{"reference":"txn-webhook-test"}}'
    ).encode()
    r = await client.post(
        f"{WEBHOOKS}/events",
        content=body,
        headers={"X-RentHub-Signature": _sign(body)},
    )
    assert r.status_code == 200
    assert r.json().get("payment_id") == pending_payment.id
    await db_session.refresh(pending_payment)
    assert pending_payment.status == PaymentStatus.PAID


async def test_payment_alias_rejects_rental_event(client, webhook_secret):
    body = b'{"event":"rental.completed","data":{"rental_id":1}}'
    r = await client.post(
        f"{WEBHOOKS}/payment",
        content=body,
        headers={"X-RentHub-Signature": _sign(body)},
    )
    assert r.status_code == 400


async def test_invalid_json_is_422(client, webhook_secret):
    body = b"not-json"
    r = await client.post(
        f"{WEBHOOKS}/events",
        content=body,
        headers={"X-RentHub-Signature": _sign(body)},
    )
    assert r.status_code == 422


def test_rental_forward_only_ordering():
    from app.services.webhook_events import _rental_rank
    from app.core.enums import RentalStatus

    # A completed rental is never dragged backwards by a late "picked_up".
    assert _rental_rank(RentalStatus.PICKED_UP) < _rental_rank(RentalStatus.COMPLETED)
    assert _rental_rank(RentalStatus.RESERVED) == 0

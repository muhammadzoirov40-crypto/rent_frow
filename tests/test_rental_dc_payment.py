"""Paying for an accepted request through DC Wallet: link out, callback in,
money to the payment, exactly once.

The renter's [Пардохт] now opens the provider's page for the amount the
server worked out - never one the browser named - and the reference in
``f3`` is bound to that exact payment row, so the callback can settle *it*
instead of crediting a balance this project does not use. Three properties
pin the flow down:

* the link is the request's own amount, for this renter, re-openable,
* nothing is paid without the shared secret, and a wrong amount pays nothing,
* a callback pays the payment exactly once, however often it is replayed -
  an operator confirming by hand in the meantime included.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from urllib.parse import parse_qs, urlparse

from app.core.enums import PaymentStatus, PaymentType, RentalRequestStatus
from app.models.user import User
from app.schemas.payment import PaymentCreate
from app.services.payment import PaymentService
from tests.test_payments import _make_user, _seed_accepted_request
from tests.test_topup_flow import _Settings

API = "/api/v1/payments"
WEBHOOK = "/api/v1/webhooks/pay-dc"
SECRET = "test-paydc-secret"


def _dest(url: str) -> str:
    """The account a checkout link collects under - the ``a`` parameter."""
    return parse_qs(urlparse(url).query)["a"][0]


async def _seed(db: AsyncSession, renter_id: int, **kwargs):
    """An accepted request the fixture customer can pay for - committed, so
    the app's own sessions see it. The owner has a DC wallet on file, which
    is what makes a checkout payable at all; the one test that needs the
    opposite clears it again."""
    owner_id = await _make_user(db, "owner")
    owner = await db.get(User, owner_id)
    owner.dc_account = "992900111222"
    request = await _seed_accepted_request(db, renter_id, owner_id, **kwargs)
    await db.commit()
    return request


async def _open(client: AsyncClient, request_id: int, kind: str = "BOOKING") -> dict:
    resp = await client.post(
        f"{API}/pay-dc",
        json={"rental_request_id": request_id, "payment_type": kind},
    )
    assert resp.status_code == 200, f"{resp.status_code} {resp.text}"
    return resp.json()["data"]


async def _lines(client: AsyncClient, request_id: int) -> list[dict]:
    resp = await client.get(f"{API}/rental-request/{request_id}")
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]


# ---------------------------------------------------------------- the link
@pytest.mark.asyncio
async def test_the_link_carries_the_requests_own_amount_for_this_renter(
    customer_client: AsyncClient, db_session: AsyncSession, customer_id: int
):
    request = await _seed(db_session, customer_id, total=200.0, deposit=50.0)

    rent = await _open(customer_client, request.id)
    deposit = await _open(customer_client, request.id, "DEPOSIT")

    # the provider's page, the server's price, the reference it must echo
    assert rent["url"].startswith("https://pay.dc.tj/?a=")
    assert "s=200.00" in rent["url"]
    assert "s=50.00" not in rent["url"], "the deposit is not charged as rent"
    assert "f2=%d" % customer_id in rent["url"]
    assert rent["url"].split("f3=")[-1] == rent["reference"]
    assert "s=50.00" in deposit["url"]
    assert deposit["reference"] != rent["reference"]

    # the payment is a row like any other: still waiting, still the request's
    assert rent["payment"]["status"] == "PENDING"
    assert float(rent["payment"]["amount"]) == 200.0
    assert rent["payment"]["rental_request_id"] == request.id

    # and the reference rides along on every read, for the statement
    lines = await _lines(customer_client, request.id)
    assert len(lines) == 2
    assert {row["payment_reference"] for row in lines} == {
        rent["reference"],
        deposit["reference"],
    }


@pytest.mark.asyncio
async def test_an_unfinished_checkout_reopens_its_own_reference(
    customer_client: AsyncClient, db_session: AsyncSession, customer_id: int
):
    request = await _seed(db_session, customer_id)

    first = await _open(customer_client, request.id)
    second = await _open(customer_client, request.id)

    assert second["reference"] == first["reference"], (
        "an abandoned checkout re-opens, it does not dead-end"
    )
    assert second["url"] == first["url"]
    lines = await _lines(customer_client, request.id)
    assert len(lines) == 1, "one payment, one reference - never two rows"


# --------------------------------------------------------------- the guards
@pytest.mark.asyncio
async def test_the_checkout_refuses_whom_the_plain_endpoint_refuses(
    db_session: AsyncSession, customer_id: int
):
    service = PaymentService(db_session)
    stranger_id = await _make_user(db_session, "stranger")

    # not the renter
    request = await _seed(db_session, customer_id)
    with pytest.raises(Exception) as exc:
        await service.pay_dc(
            stranger_id,
            PaymentCreate(rental_request_id=request.id, payment_type=PaymentType.BOOKING),
        )
    assert getattr(exc.value, "status_code", None) == 403

    # not accepted yet
    pending = await _seed(
        db_session, customer_id, status=RentalRequestStatus.PENDING
    )
    with pytest.raises(Exception) as exc:
        await service.pay_dc(
            customer_id,
            PaymentCreate(rental_request_id=pending.id, payment_type=PaymentType.BOOKING),
        )
    assert getattr(exc.value, "status_code", None) == 400

    # no deposit asked, none collectable
    no_deposit = await _seed(db_session, customer_id, deposit=0.0)
    with pytest.raises(Exception) as exc:
        await service.pay_dc(
            customer_id,
            PaymentCreate(rental_request_id=no_deposit.id, payment_type=PaymentType.DEPOSIT),
        )
    assert getattr(exc.value, "status_code", None) == 400

    # a booking is not a rental request - the DC route only ever takes those
    with pytest.raises(Exception) as exc:
        await service.pay_dc(
            customer_id,
            PaymentCreate(booking_id=7, amount=10.0, payment_type=PaymentType.BOOKING),
        )
    assert getattr(exc.value, "status_code", None) == 400


@pytest.mark.asyncio
async def test_a_disabled_provider_refuses_and_leaves_no_row_behind(
    customer_client: AsyncClient, db_session: AsyncSession, customer_id: int
):
    request = await _seed(db_session, customer_id)

    with _Settings(PAYDC_ENABLED=False):
        resp = await customer_client.post(
            f"{API}/pay-dc",
            json={"rental_request_id": request.id, "payment_type": "BOOKING"},
        )
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "TOPUP_DISABLED"
    # the whole call rolls back: no payment row the renter cannot pay for
    assert await _lines(customer_client, request.id) == []


# --------------------------------------------------------------- the callback
@pytest.mark.asyncio
async def test_the_callback_pays_the_payment_exactly_once(
    customer_client: AsyncClient, db_session: AsyncSession, customer_id: int
):
    request = await _seed(db_session, customer_id, total=200.0)
    opened = await _open(customer_client, request.id)
    body = {"secret": SECRET, "f3": opened["reference"], "s": "200.00"}

    with _Settings(PAYDC_WEBHOOK_SECRET=SECRET):
        first = await customer_client.post(WEBHOOK, json=body)
        assert first.status_code == 200, first.text
        assert first.json()["credited"] is True
        assert first.json()["reason"] == "PAYMENT_PAID"

        lines = await _lines(customer_client, request.id)
        assert [row["status"] for row in lines] == ["PAID"]

        # the provider retries - and is answered, not obeyed
        again = await customer_client.post(WEBHOOK, json=body)
        assert again.status_code == 200, again.text
        assert again.json()["credited"] is False
        assert again.json()["reason"] == "ALREADY_PAID"

    lines = await _lines(customer_client, request.id)
    assert [row["status"] for row in lines] == ["PAID"], "still exactly one payment"


@pytest.mark.asyncio
async def test_a_wrong_amount_pays_nothing(
    customer_client: AsyncClient, db_session: AsyncSession, customer_id: int
):
    request = await _seed(db_session, customer_id, total=200.0)
    opened = await _open(customer_client, request.id)

    with _Settings(PAYDC_WEBHOOK_SECRET=SECRET):
        resp = await customer_client.post(
            WEBHOOK,
            json={
                "secret": SECRET,
                "f3": opened["reference"],
                "s": "1.00",
            },
        )
    assert resp.status_code == 200, resp.text
    assert resp.json()["credited"] is False
    assert resp.json()["reason"] == "AMOUNT_MISMATCH"
    # a retry with the right amount must still be able to settle it
    lines = await _lines(customer_client, request.id)
    assert [row["status"] for row in lines] == ["PENDING"]


# ------------------------------------------------ the operator and the panel
@pytest.mark.asyncio
async def test_the_operator_sees_the_reference_and_can_close_it_by_hand(
    admin_client: AsyncClient,
    customer_client: AsyncClient,
    db_session: AsyncSession,
    customer_id: int,
):
    request = await _seed(db_session, customer_id, total=120.0)
    opened = await _open(customer_client, request.id)

    rows = await admin_client.get(f"{API}/admin/all")
    assert rows.status_code == 200, rows.text
    mine = [r for r in rows.json()["data"] if r["rental_request_id"] == request.id]
    assert len(mine) == 1
    assert mine[0]["payment_reference"] == opened["reference"], (
        "the statement match lives on the row"
    )
    assert mine[0]["status"] == "PENDING"

    confirm = await admin_client.post(f"{API}/{mine[0]['id']}/confirm")
    assert confirm.status_code == 200, confirm.text
    assert confirm.json()["data"]["status"] == "PAID"

    # closing by hand does not leave the link dangling: when the callback
    # finally arrives, it closes the reference instead of paying twice
    with _Settings(PAYDC_WEBHOOK_SECRET=SECRET):
        late = await customer_client.post(
            WEBHOOK,
            json={"secret": SECRET, "f3": opened["reference"], "s": "120.00"},
        )
    assert late.status_code == 200, late.text
    assert late.json()["credited"] is False
    assert late.json()["reason"] == "ALREADY_PAID"

    again = await admin_client.post(f"{API}/{mine[0]['id']}/confirm")
    assert again.status_code == 400, again.text


# ------------------------------------------------ the destination account
@pytest.mark.asyncio
async def test_rent_is_collected_under_the_owners_own_dc_account(
    customer_client: AsyncClient, db_session: AsyncSession, customer_id: int
):
    """The whole point: rent lands with the person who rented it out."""
    request = await _seed(db_session, customer_id, total=200.0, deposit=50.0)

    owner = await db_session.get(User, request.owner_id)
    # Written straight to the column, the way an account saved before the
    # nine-digit rule existed would be: the checkout is what has to cope.
    owner.dc_account = "992900111222"
    await db_session.commit()

    opened = await _open(customer_client, request.id)
    assert _dest(opened["url"]) == "900111222", (
        "the checkout must be pointed at the owner's own DC account, in the "
        "form DC routes a transfer by"
    )

    # the deposit is theirs too - it is held against their listing
    deposit = await _open(customer_client, request.id, "DEPOSIT")
    assert _dest(deposit["url"]) == "900111222"


@pytest.mark.asyncio
async def test_an_owner_with_no_account_refuses_the_checkout(
    customer_client: AsyncClient, db_session: AsyncSession, customer_id: int
):
    """Money that cannot reach the owner must not move at all.

    Falling back to the platform's merchant account would take the rent from
    the renter and leave the owner with nothing and no way of noticing, so
    the checkout stops with a code instead — and stops before a payment row
    exists, so there is nothing to unwind. The moment the owner registers a
    wallet, the very same checkout goes through.
    """
    request = await _seed(db_session, customer_id, total=200.0)

    owner = await db_session.get(User, request.owner_id)
    owner.dc_account = None
    await db_session.commit()

    resp = await customer_client.post(
        f"{API}/pay-dc",
        json={"rental_request_id": request.id, "payment_type": "BOOKING"},
    )
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "OWNER_HAS_NO_DC_ACCOUNT"
    assert await _lines(customer_client, request.id) == []

    owner.dc_account = "992900111222"
    await db_session.commit()

    opened = await _open(customer_client, request.id)
    assert _dest(opened["url"]) == "900111222"

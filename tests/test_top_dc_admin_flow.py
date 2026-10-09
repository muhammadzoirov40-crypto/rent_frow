"""Closing a DC Wallet payment: panel confirm, admin email, customer receipt.

Three ways the request from Admin -> TOP becomes answerable money:

 26. the operator confirms the payment by promotion id - admin only, once,
     through the same idempotent settle the webhook uses
 27. every admin hears the price and the reference by email the moment a DC
     checkout opens (the in-app notification existed before; this is the
     second channel, and it may not be able to stop the purchase)
 28. the customer attaches the receipt (screenshot); owner-only, refused
     once paid, and visible - with the reference - in both the owner's and
     the admin's lists
"""

import pytest
from httpx import AsyncClient

from conftest import _ensure_user
from app.core.enums import (
    TopPromotionPayment,
    TopPromotionStatus,
    UserRole,
)

from tests.test_top_dc_payment import (
    _balance_of,
    _intents,
    _open_dc,
    _promo_rows,
    _seed_listing,
    _seed_plan,
)

API = "/api/v1/promotions"


# --------------------------------------------------- 26: by promotion id
async def test_admin_confirms_the_dc_payment_by_promotion_id(
    customer_client: AsyncClient,
    admin_client: AsyncClient,
    customer_id: int,
):
    plan_id = await _seed_plan(price=40)
    listing_id = await _seed_listing(customer_id)
    before = await _balance_of(customer_id)
    data = (await _open_dc(customer_client, listing_id, plan_id)).json()["data"]
    promo_id = data["promotion"]["id"]

    # the checkout response already carries the reference it will settle by
    assert data["promotion"]["payment_reference"] == data["reference"]

    # a customer must never be able to stamp their own payment as paid
    denied = await customer_client.post(f"{API}/admin/{promo_id}/confirm-payment")
    assert denied.status_code == 403, denied.text

    first = await admin_client.post(f"{API}/admin/{promo_id}/confirm-payment")
    assert first.status_code == 200, first.text
    assert first.json()["message"] == "PROMOTION_ACTIVATED"
    body = first.json()["data"]
    assert body["status"] == "ACTIVE"
    assert body["payment_status"] == "PAID"
    assert body["payment_reference"] == data["reference"]

    # the money bought a window, not a balance
    promo = (await _promo_rows(listing_id=listing_id))[0]
    assert promo.status == TopPromotionStatus.ACTIVE
    assert promo.payment_status == TopPromotionPayment.PAID
    assert promo.started_at is not None and promo.expires_at is not None
    assert await _balance_of(customer_id) == before
    assert (await _intents(promo.id))[0].status == "PAID"

    # the operator clicks twice, or the callback turns up later: once only
    again = await admin_client.post(f"{API}/admin/{promo_id}/confirm-payment")
    assert again.status_code == 200, again.text
    assert again.json()["message"] == "ALREADY_PAID"
    assert await _balance_of(customer_id) == before

    # a request that never went through DC has no reference to match:
    # approving it is approve's job, not a invented "payment confirmed"
    plain_listing = await _seed_listing(customer_id)
    plain = await customer_client.post(
        API, json={"listing_id": plain_listing, "plan_id": plan_id}
    )
    assert plain.status_code == 200, plain.text
    plain_id = plain.json()["data"]["promotion"]["id"]
    refused = await admin_client.post(f"{API}/admin/{plain_id}/confirm-payment")
    assert refused.status_code == 400, refused.text
    assert refused.json()["detail"] == "NOT_DC_PAYMENT"


# --------------------------------------------------- 27: the admin email
async def test_every_admin_gets_the_price_and_reference_by_email(
    customer_client: AsyncClient, customer_id: int, monkeypatch: pytest.MonkeyPatch
):
    await _ensure_user("top_admin_mail@rentflow.com", UserRole.ADMIN)
    plan_id = await _seed_plan(price=40)
    listing_id = await _seed_listing(customer_id)

    sent: list[tuple[str, tuple[str, str, str]]] = []
    monkeypatch.setattr(
        "app.services.email.send_in_background",
        lambda to, template: sent.append((to, template)) or True,
    )

    data = (await _open_dc(customer_client, listing_id, plan_id)).json()["data"]
    ref = data["reference"]

    assert sent, "a new DC request must reach the admins by email too"
    recipients = [to for to, _ in sent]
    assert "top_admin_mail@rentflow.com" in recipients
    for _, (subject, text, html) in sent:
        assert "DC Wallet" in subject
        # exactly what an operator acts on: the price and the reference
        assert ref in text and ref in html
        assert "40" in text and "40" in html


# --------------------------------------------------- 28: the receipt
async def test_customer_sends_the_receipt_and_the_admin_sees_it(
    customer_client: AsyncClient,
    admin_client: AsyncClient,
    customer_id: int,
    client: AsyncClient,
):
    plan_id = await _seed_plan(price=40)
    listing_id = await _seed_listing(customer_id)
    data = (await _open_dc(customer_client, listing_id, plan_id)).json()["data"]
    promo_id = data["promotion"]["id"]
    png = {"file": ("check.png", b"\x89PNG\r\n\x1a\nfake", "image/png")}

    # a visitor is sent to the login first, and touches no storage
    anon = await client.post(f"{API}/{promo_id}/check", files=png)
    assert anon.status_code in (401, 403), anon.text

    # only real pictures: the same rule post images live by
    wrong_type = await customer_client.post(
        f"{API}/{promo_id}/check",
        files={"file": ("check.txt", b"x", "text/plain")},
    )
    assert wrong_type.status_code == 400, wrong_type.text

    ok = await customer_client.post(f"{API}/{promo_id}/check", files=png)
    assert ok.status_code == 200, ok.text
    check_url = ok.json()["data"]["check_image_url"]
    assert check_url and "top_checks" in check_url, check_url

    # the owner's own list: reference and receipt together
    mine = (await customer_client.get(f"{API}/mine")).json()["data"]
    row = next(r for r in mine if r["id"] == promo_id)
    assert row["payment_reference"] == data["reference"]
    assert row["check_image_url"] == check_url

    # ...and the admin's list, which is where the pair gets acted on
    admin_rows = (await admin_client.get(f"{API}/admin/list")).json()["data"]
    admin_row = next(r for r in admin_rows if r["id"] == promo_id)
    assert admin_row["payment_reference"] == data["reference"]
    assert admin_row["check_image_url"] == check_url

    # receipt in front of the operator: the confirm closes it
    confirm = await admin_client.post(f"{API}/admin/{promo_id}/confirm-payment")
    assert confirm.status_code == 200, confirm.text
    assert confirm.json()["message"] == "PROMOTION_ACTIVATED"

    # paid - there is nothing left to prove, so nothing left to attach
    again = await customer_client.post(f"{API}/{promo_id}/check", files=png)
    assert again.status_code == 400, again.text
    assert again.json()["detail"] == "ALREADY_PAID"

    # a rejected request is closed: no receipts on dead rows
    rej_listing = await _seed_listing(customer_id)
    rej = await _open_dc(customer_client, rej_listing, plan_id)
    rej_id = rej.json()["data"]["promotion"]["id"]
    rejected = await admin_client.post(
        f"{API}/admin/{rej_id}/reject", json={"reason": "no money in the statement"}
    )
    assert rejected.status_code == 200, rejected.text
    blocked = await customer_client.post(f"{API}/{rej_id}/check", files=png)
    assert blocked.status_code == 400, blocked.text
    assert blocked.json()["detail"] == "PROMOTION_CLOSED"

"""The TOP promotion spec, held to account - 17 scenarios, no real waiting.

Everything runs on a controlled clock: a window is "past" the moment the test
writes a past ``expires_at`` (exactly what the background loop looks at),
durations are asserted against ``add_duration`` directly, and money is
asserted on the ledger rather than on what the endpoint *says* it did.

What is under test, in the spec's order:

  1. plans are public to read, admin-only to write - prices come from the DB
  2. a user cannot smuggle price / status / expiry through the request body
  3. price 0 (admin's choice) activates immediately, wallet untouched
  4. wallet charge -> ACTIVE + PAID + one PROMO ledger row + balance down
  5. insufficient balance -> PENDING + UNPAID, nobody charged
  6. a repeated "Make TOP" is 409 with exactly one charge
  7. only the owner (or an admin) may promote a listing
  8. a non-ACTIVE listing cannot be promoted
  9. a disabled plan cannot be bought
 10. the admin is notified of every pending request
 11. approval starts the window at approval time, never at request time
 12. rejection carries the reason to the owner and frees the listing again
 13. deactivating a PAID window refunds it exactly once
 14. expiry is server-side: read paths hide it first, the loop then flips
     EXPIRED - listing untouched, history kept, no re-charge
 15. manual activation grants a fresh full window
 16. admin stats count per status and sum only PAID money
 17. every admin route is 403 for a normal customer
"""

from datetime import datetime, timedelta

import pytest
from sqlalchemy import select, update

from conftest import TestSessionLocal, _ensure_user
from app.core.config import get_settings
from app.core.enums import (
    ListingStatus,
    TopPromotionPayment,
    TopPromotionStatus,
    UserRole,
    WalletTransactionType,
)
from app.models.category import Category
from app.models.city import City
from app.models.listing import Listing
from app.models.notification import Notification
from app.models.promotion import TopPlan, TopPromotion
from app.models.wallet import WalletTransaction
from app.services.promotion import add_duration, expire_due
from app.services.wallet import WalletService, money_d

API = "/api/v1/promotions"
LISTINGS = "/api/v1/listings"


# ------------------------------------------------------------------ helpers
async def _seed_plan(
    price: float = 40,
    active: bool = True,
    duration_key: str = "1d",
    name: str = "Test plan",
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
        category = Category(name=f"TopCat-{tag}")
        city = City(name=f"TopCity-{tag}")
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


async def _set_balance(user_id: int, balance: str) -> None:
    from app.models.wallet import Wallet

    async with TestSessionLocal() as s:
        await WalletService(s).get_or_create(user_id)
        await s.execute(
            update(Wallet)
            .where(Wallet.user_id == user_id)
            .values(balance=money_d(balance), held=money_d("0.00"))
        )
        await s.commit()


async def _balance_of(user_id: int) -> float:
    async with TestSessionLocal() as s:
        summary = await WalletService(s).summary(user_id)
        return float(summary["balance"])


async def _promo_rows(**filters) -> list[TopPromotion]:
    async with TestSessionLocal() as s:
        stmt = select(TopPromotion)
        for key, value in filters.items():
            stmt = stmt.where(getattr(TopPromotion, key) == value)
        return list((await s.execute(stmt)).scalars().all())


async def _set_expires(promo_id: int, moment: datetime) -> None:
    async with TestSessionLocal() as s:
        await s.execute(
            update(TopPromotion).where(TopPromotion.id == promo_id).values(expires_at=moment)
        )
        await s.commit()


async def _notif(user_id: int, ntype: str) -> list[Notification]:
    async with TestSessionLocal() as s:
        rows = await s.execute(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.type == ntype,
            )
        )
        return list(rows.scalars().all())


async def _ledger(user_id: int) -> list[WalletTransaction]:
    async with TestSessionLocal() as s:
        rows = await s.execute(
            select(WalletTransaction)
            .where(WalletTransaction.user_id == user_id)
            .order_by(WalletTransaction.id)
        )
        return list(rows.scalars().all())


async def _run_expire_due() -> int:
    async with TestSessionLocal() as s:
        return await expire_due(s)


@pytest.fixture
def wallet_on(monkeypatch):
    monkeypatch.setattr(get_settings(), "WALLET_ENABLED", True)


@pytest.fixture
def wallet_off(monkeypatch):
    monkeypatch.setattr(get_settings(), "WALLET_ENABLED", False)


# ------------------------------------------------- 1: plans & who writes them
async def test_plans_are_public_to_read_but_admin_only_to_write(
    admin_client, customer_client, client
):
    created = await admin_client.post(
        f"{API}/admin/plans",
        json={"name": "Week", "duration_key": "1w", "price": 75, "is_active": True},
    )
    assert created.status_code == 200, created.text
    plan_id = created.json()["data"]["id"]

    public = await client.get(f"{API}/plans")
    assert public.status_code == 200
    assert [p["id"] for p in public.json()["data"]] == [plan_id]
    assert public.json()["data"][0]["price"] == 75

    # a customer holds none of the admin doors
    for method, path, payload in (
        ("get", f"{API}/admin/plans", None),
        ("post", f"{API}/admin/plans", {"name": "X", "duration_key": "1d", "price": 1}),
        ("get", f"{API}/admin/list", None),
        ("get", f"{API}/admin/stats", None),
    ):
        kwargs = {"json": payload} if payload is not None else {}
        response = await getattr(customer_client, method)(path, **kwargs)
        assert response.status_code == 403, (method, path, response.status_code)


async def test_disabled_plans_are_not_listed_publicly(admin_client, client):
    await admin_client.post(
        f"{API}/admin/plans",
        json={"name": "Hidden", "duration_key": "3h", "price": 10, "is_active": False},
    )
    public = await client.get(f"{API}/plans")
    assert public.status_code == 200
    assert public.json()["data"] == []


# ------------------------------------------- 2: the body cannot name a price
async def test_user_cannot_smuggle_price_status_or_expiry(
    admin_client, customer_client, customer_id, wallet_on
):
    plan_id = await _seed_plan(price=40)
    await _set_balance(customer_id, 5)  # not enough - nothing may activate
    listing_id = await _seed_listing(customer_id)

    response = await customer_client.post(
        f"{API}",
        json={
            "listing_id": listing_id,
            "plan_id": plan_id,
            "price": 1,
            "status": "ACTIVE",
            "payment_status": "PAID",
            "expires_at": "2099-01-01T00:00:00",
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["active"] is False
    promo = data["promotion"]
    # the server's numbers won over the client's
    assert promo["price"] == 40
    assert promo["status"] == TopPromotionStatus.PENDING.value
    assert promo["payment_status"] == TopPromotionPayment.UNPAID.value

    assert await _balance_of(customer_id) == 5
    assert not [t for t in await _ledger(customer_id) if t.type == WalletTransactionType.PROMO]

    # the admin's own price edit is what future requests pay
    edited = await admin_client.put(
        f"{API}/admin/plans/{plan_id}", json={"price": 60}
    )
    assert edited.status_code == 200
    again = await customer_client.post(
        f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
    )
    # the first promotion is still open, so this must be refused - not
    # silently charged a second time
    assert again.status_code == 409


# ------------------------------------------------ 3: price 0 is instant
async def test_price_zero_activates_without_touching_the_wallet(
    customer_client, customer_id, wallet_on
):
    plan_id = await _seed_plan(price=0, duration_key="3h")
    listing_id = await _seed_listing(customer_id)

    response = await customer_client.post(
        f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["active"] is True
    promo = data["promotion"]
    assert promo["status"] == TopPromotionStatus.ACTIVE.value
    assert promo["payment_status"] == TopPromotionPayment.PAID.value
    started = datetime.fromisoformat(promo["started_at"])
    expires = datetime.fromisoformat(promo["expires_at"])
    assert timedelta(hours=2, minutes=59) <= expires - started <= timedelta(hours=3, minutes=1)
    assert not await _ledger(customer_id)


# -------------------------------------------------- 4: the wallet charge
async def test_wallet_charge_activates_and_records_one_promo_ledger_row(
    customer_client, customer_id, wallet_on
):
    plan_id = await _seed_plan(price=40, duration_key="1w")
    listing_id = await _seed_listing(customer_id)
    await _set_balance(customer_id, 100)

    response = await customer_client.post(
        f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["active"] is True
    assert data["promotion"]["payment_status"] == TopPromotionPayment.PAID.value
    assert data["promotion"]["price"] == 40

    assert await _balance_of(customer_id) == 60
    promo_rows = [t for t in await _ledger(customer_id) if t.type == WalletTransactionType.PROMO]
    assert len(promo_rows) == 1
    assert float(promo_rows[0].amount) == -40

    promo = (await _promo_rows(listing_id=listing_id))[0]
    assert promo.status == TopPromotionStatus.ACTIVE
    # the window is 7 days, from now
    delta = promo.expires_at - promo.started_at
    assert timedelta(days=6, hours=23) <= delta <= timedelta(days=7, hours=1)


# --------------------------------------- 5: not enough money -> approval queue
async def test_insufficient_balance_goes_to_admin_approval_unpaid(
    customer_client, customer_id, wallet_on
):
    plan_id = await _seed_plan(price=40)
    listing_id = await _seed_listing(customer_id)
    await _set_balance(customer_id, 10)

    response = await customer_client.post(
        f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["active"] is False
    assert data["promotion"]["status"] == TopPromotionStatus.PENDING.value
    assert data["promotion"]["payment_status"] == TopPromotionPayment.UNPAID.value

    assert await _balance_of(customer_id) == 10  # untouched
    assert not await _ledger(customer_id)


async def test_wallet_switched_off_still_queues_instead_of_charging(
    customer_client, customer_id, wallet_off
):
    plan_id = await _seed_plan(price=40)
    listing_id = await _seed_listing(customer_id)

    response = await customer_client.post(
        f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
    )
    assert response.status_code == 200
    assert response.json()["data"]["promotion"]["status"] == TopPromotionStatus.PENDING.value
    assert not await _ledger(customer_id)


# --------------------------------------------------- 6: no double charge
async def test_repeated_request_is_409_with_exactly_one_charge(
    customer_client, customer_id, wallet_on
):
    plan_id = await _seed_plan(price=40)
    listing_id = await _seed_listing(customer_id)
    await _set_balance(customer_id, 100)

    first = await customer_client.post(
        f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
    )
    assert first.status_code == 200

    # impatience: the same body three more times
    for _ in range(3):
        repeat = await customer_client.post(
            f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
        )
        assert repeat.status_code == 409

    assert await _balance_of(customer_id) == 60  # charged once
    rows = await _promo_rows(listing_id=listing_id)
    assert len(rows) == 1


# ------------------------------------------------- 7, 8, 9: eligibility
async def test_only_the_owner_may_promote(customer_client, customer_id):
    plan_id = await _seed_plan(price=0)
    listing_id = await _seed_listing(customer_id)
    _, stranger_ext = await _ensure_user("stranger_top@rentflow.com", UserRole.OWNER)

    from datetime import datetime as dt, timedelta as td

    from httpx import ASGITransport, AsyncClient
    from jose import jwt

    from app.main import app as app_obj

    token = jwt.encode(
        {"sub": stranger_ext, "role": UserRole.OWNER.value, "exp": dt.utcnow() + td(hours=1)},
        get_settings().JWT_SECRET_KEY,
        algorithm=get_settings().JWT_ALGORITHM,
    )
    transport = ASGITransport(app=app_obj)
    async with AsyncClient(transport=transport, base_url="http://test") as intruder:
        intruder.headers["Authorization"] = f"Bearer {token}"
        response = await intruder.post(
            f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
        )
    assert response.status_code == 403


async def test_non_active_listing_cannot_be_promoted(
    customer_client, customer_id
):
    plan_id = await _seed_plan(price=0)
    listing_id = await _seed_listing(customer_id, status=ListingStatus.PAUSED)

    response = await customer_client.post(
        f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "LISTING_NOT_ACTIVE"


async def test_disabled_plan_cannot_be_bought(customer_client, customer_id):
    plan_id = await _seed_plan(price=0, active=False)
    listing_id = await _seed_listing(customer_id)

    response = await customer_client.post(
        f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "PLAN_DISABLED"


# ------------------------------------------------------- 10: admin hears about it
async def test_pending_request_notifies_every_admin_not_the_owner(
    admin_client, customer_client, customer_id
):
    plan_id = await _seed_plan(price=40)
    listing_id = await _seed_listing(customer_id)
    # a wallet first touched with no balance of its own is seeded with the
    # configured demo credit (500), which would silently *pay* for the plan -
    # pin the balance at 0 so the request really waits for approval
    await _set_balance(customer_id, 0)

    response = await customer_client.post(
        f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
    )
    assert response.status_code == 200

    admin_id, _ = await _ensure_user("test_admin@rentflow.com", UserRole.ADMIN)
    admin_notes = await _notif(admin_id, "top_request")
    assert len(admin_notes) == 1
    message = admin_notes[0].message
    assert "Promotable listing" in message
    assert "40" in message  # the price the admin configured
    assert admin_notes[0].reference_type == "top_promotion"
    assert admin_notes[0].data["listing_id"] == listing_id
    assert admin_notes[0].data["user_name"]

    # the owner hears nothing until somebody decides
    assert await _notif(customer_id, "top_activated") == []
    assert await _notif(customer_id, "top_approved") == []


# ------------------------------------------- 11: approval runs the clock
async def test_approval_starts_the_window_at_approval_time(
    admin_client, customer_client, customer_id
):
    plan_id = await _seed_plan(price=40, duration_key="1d")
    listing_id = await _seed_listing(customer_id)
    await _set_balance(customer_id, 0)  # no demo credit: this must go PENDING
    await customer_client.post(
        f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
    )
    promo = (await _promo_rows(listing_id=listing_id))[0]
    assert promo.status == TopPromotionStatus.PENDING

    before = datetime.utcnow()
    approved = await admin_client.post(f"{API}/admin/{promo.id}/approve")
    assert approved.status_code == 200, approved.text
    body = approved.json()["data"]
    assert body["status"] == TopPromotionStatus.ACTIVE.value
    # approval, not the original request, is what was paid for
    assert body["payment_status"] == TopPromotionPayment.APPROVED.value

    started = datetime.fromisoformat(body["started_at"])
    assert started >= before - timedelta(seconds=5)
    delta = datetime.fromisoformat(body["expires_at"]) - started
    assert timedelta(hours=23, minutes=59) <= delta <= timedelta(days=1, hours=1)

    owner_notes = await _notif(customer_id, "top_approved")
    assert len(owner_notes) == 1
    assert "Promotable listing" in owner_notes[0].message

    # approving twice is not a thing
    again = await admin_client.post(f"{API}/admin/{promo.id}/approve")
    assert again.status_code == 400
    assert again.json()["detail"] == "NOT_PENDING"


# ------------------------------------ 12: rejection - reason, and the slot frees
async def test_rejection_carries_the_reason_and_frees_the_listing(
    admin_client, customer_client, customer_id
):
    # a paid-in-advance plan would activate instantly and rejection needs a
    # PENDING request - so an unaffordable price keeps it waiting for the admin
    plan_id = await _seed_plan(price=40)
    listing_id = await _seed_listing(customer_id)
    await _set_balance(customer_id, 0)
    await customer_client.post(
        f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
    )
    promo = (await _promo_rows(listing_id=listing_id))[0]

    rejected = await admin_client.post(
        f"{API}/admin/{promo.id}/reject", json={"reason": "Photo does not match"}
    )
    assert rejected.status_code == 200
    body = rejected.json()["data"]
    assert body["status"] == TopPromotionStatus.REJECTED.value
    assert body["reject_reason"] == "Photo does not match"

    owner_notes = await _notif(customer_id, "top_rejected")
    assert len(owner_notes) == 1
    assert "Photo does not match" in owner_notes[0].message
    assert owner_notes[0].data["reason"] == "Photo does not match"

    # the listing itself was never touched...
    rows = await _promo_rows(listing_id=listing_id)
    assert rows[0].status == TopPromotionStatus.REJECTED

    # ...and rejection does not lock the listing out of trying again
    retry = await customer_client.post(
        f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
    )
    assert retry.status_code == 200


# ------------------------------------- 13: deactivation refunds exactly once
async def test_deactivating_a_paid_window_refunds_it_once(
    admin_client, customer_client, customer_id, wallet_on
):
    plan_id = await _seed_plan(price=40)
    listing_id = await _seed_listing(customer_id)
    await _set_balance(customer_id, 50)
    await customer_client.post(
        f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
    )
    assert await _balance_of(customer_id) == 10
    promo = (await _promo_rows(listing_id=listing_id))[0]

    cancelled = await admin_client.post(f"{API}/admin/{promo.id}/cancel")
    assert cancelled.status_code == 200, cancelled.text
    body = cancelled.json()["data"]
    assert body["status"] == TopPromotionStatus.CANCELLED.value
    assert body["payment_status"] == TopPromotionPayment.REFUNDED.value
    assert await _balance_of(customer_id) == 50  # money back

    # a second cancel is refused, so a second refund cannot happen
    again = await admin_client.post(f"{API}/admin/{promo.id}/cancel")
    assert again.status_code == 400
    assert await _balance_of(customer_id) == 50

    assert await _notif(customer_id, "top_cancelled")


# -------------------------- 14: expiry is server-side and preserves everything
async def test_expiry_hides_immediately_flips_later_and_never_recharges(
    admin_client, customer_client, customer_id, wallet_on
):
    plan_id = await _seed_plan(price=40)
    listing_id = await _seed_listing(customer_id)
    await _set_balance(customer_id, 100)
    await customer_client.post(
        f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
    )
    promo = (await _promo_rows(listing_id=listing_id))[0]
    assert promo.status == TopPromotionStatus.ACTIVE

    # nobody waits: the clock simply is in the past now
    await _set_expires(promo.id, datetime.utcnow() - timedelta(minutes=1))

    # (a) before the loop has run at all, the read paths already hide it
    top = await admin_client.get(f"{LISTINGS}/top")
    assert top.status_code == 200
    assert top.json()["data"] == []
    search = await admin_client.get(f"{LISTINGS}")
    assert search.status_code == 200
    assert all(item["id"] != listing_id or item["is_top"] is False
               for item in search.json()["data"])
    mine = await customer_client.get(f"{API}/mine")
    assert mine.status_code == 200

    # (b) the loop's single UPDATE flips it, idempotently
    assert await _run_expire_due() == 1
    assert await _run_expire_due() == 0

    rows = await _promo_rows(listing_id=listing_id)
    assert rows[0].status == TopPromotionStatus.EXPIRED
    # history is preserved: the row, its price and its payment stay
    assert float(rows[0].price) == 40
    assert rows[0].payment_status == TopPromotionPayment.PAID

    # (c) the listing itself survives untouched - expiry does not unpublish
    async with TestSessionLocal() as s:
        listing = await s.get(Listing, listing_id)
        assert listing.status == ListingStatus.ACTIVE
        assert listing.available is True

    # (d) no second charge, ever
    assert await _balance_of(customer_id) == 60
    promo_ledger = [t for t in await _ledger(customer_id)
                    if t.type == WalletTransactionType.PROMO]
    assert len(promo_ledger) == 1

    # (e) the owner can still see the record in "my promotions"
    mine = (await customer_client.get(f"{API}/mine")).json()["data"]
    assert [m["status"] for m in mine] == [TopPromotionStatus.EXPIRED.value]


# -------------------------------------------- 15: manual activation is fresh
async def test_manual_activation_grants_a_fresh_window(
    admin_client, customer_client, customer_id
):
    plan_id = await _seed_plan(price=0, duration_key="3h")
    listing_id = await _seed_listing(customer_id)
    await customer_client.post(
        f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
    )
    promo = (await _promo_rows(listing_id=listing_id))[0]
    await _set_expires(promo.id, datetime.utcnow() - timedelta(days=2))
    assert await _run_expire_due() == 1

    # the instant purchase already notified once - activation must add exactly
    # one more, not duplicate history
    before_count = len(await _notif(customer_id, "top_activated"))
    before = datetime.utcnow()
    activated = await admin_client.post(f"{API}/admin/{promo.id}/activate")
    assert activated.status_code == 200, activated.text
    body = activated.json()["data"]
    assert body["status"] == TopPromotionStatus.ACTIVE.value
    started = datetime.fromisoformat(body["started_at"])
    expires = datetime.fromisoformat(body["expires_at"])
    assert started >= before - timedelta(seconds=5)
    assert timedelta(hours=2, minutes=59) <= expires - started <= timedelta(hours=3, minutes=1)

    assert len(await _notif(customer_id, "top_activated")) == before_count + 1
    # it is live on the homepage section again
    top = await admin_client.get(f"{LISTINGS}/top")
    assert [item["id"] for item in top.json()["data"]] == [listing_id]
    assert top.json()["data"][0]["is_top"] is True


# ------------------------------------------------------ 16: admin statistics
async def test_admin_stats_count_statuses_and_sum_only_paid_money(
    admin_client, customer_client, customer_id, wallet_on
):
    await _set_balance(customer_id, 100)

    paid_plan = await _seed_plan(price=40, name="Paid plan")  # charges -> PAID
    free_plan = await _seed_plan(price=0, name="Free plan")   # price 0 -> PAID 0
    unpaid_plan = await _seed_plan(price=999, name="Rich plan")  # -> PENDING

    paid_listing = await _seed_listing(customer_id)
    await customer_client.post(
        f"{API}", json={"listing_id": paid_listing, "plan_id": paid_plan}
    )
    free_listing = await _seed_listing(customer_id)
    await customer_client.post(
        f"{API}", json={"listing_id": free_listing, "plan_id": free_plan}
    )
    unpaid_listing = await _seed_listing(customer_id)
    await customer_client.post(
        f"{API}", json={"listing_id": unpaid_listing, "plan_id": unpaid_plan}
    )

    # expire the paid one to have an EXPIRED + PAID row in the mix
    paid_promo = (await _promo_rows(listing_id=paid_listing))[0]
    await _set_expires(paid_promo.id, datetime.utcnow() - timedelta(minutes=1))
    assert await _run_expire_due() == 1

    stats = await admin_client.get(f"{API}/admin/stats")
    assert stats.status_code == 200
    data = stats.json()["data"]
    assert data["total"] == 3
    assert data["expired"] == 1
    assert data["active"] == 1  # the free one
    assert data["pending"] == 1
    assert data["rejected"] == 0
    # revenue is money that actually moved: 40 paid + 0 free, never 999 pending
    assert float(data["revenue"]) == 40
    assert len(data["plans"]) == 3

    # filters work for the table
    pending_list = await admin_client.get(f"{API}/admin/list", params={"status": "PENDING"})
    assert pending_list.status_code == 200
    assert pending_list.json()["total"] == 1
    assert pending_list.json()["data"][0]["listing_id"] == unpaid_listing

    by_user = await admin_client.get(
        f"{API}/admin/list", params={"user_id": customer_id}
    )
    assert by_user.json()["total"] == 3

    bad = await admin_client.get(f"{API}/admin/list", params={"status": "WHATEVER"})
    assert bad.status_code == 400


# ------------------------------------------- 17: customer touches no admin route
async def test_admin_actions_are_forbidden_for_a_customer(
    customer_client, customer_id
):
    plan_id = await _seed_plan(price=0)
    listing_id = await _seed_listing(customer_id)
    await customer_client.post(
        f"{API}", json={"listing_id": listing_id, "plan_id": plan_id}
    )
    promo = (await _promo_rows(listing_id=listing_id))[0]

    for method, path, payload in (
        ("post", f"{API}/admin/{promo.id}/approve", None),
        ("post", f"{API}/admin/{promo.id}/reject", {"reason": "nope"}),
        ("post", f"{API}/admin/{promo.id}/cancel", None),
        ("post", f"{API}/admin/{promo.id}/activate", None),
        ("put", f"{API}/admin/plans/{plan_id}", {"price": 1}),
    ):
        response = await getattr(customer_client, method)(path, json=payload)
        assert response.status_code == 403, (method, path, response.status_code)

    # and the promotion is exactly as the owner left it
    rows = await _promo_rows(listing_id=listing_id)
    assert rows[0].status == TopPromotionStatus.ACTIVE


# ------------------------------------------------------------ clock arithmetic
def test_add_duration_is_exact_and_calendar_aware():
    base = datetime(2026, 6, 15, 12, 0, 0)
    assert add_duration(base, "3h") == datetime(2026, 6, 15, 15, 0, 0)
    assert add_duration(base, "1d") == datetime(2026, 6, 16, 12, 0, 0)
    assert add_duration(base, "1w") == datetime(2026, 6, 22, 12, 0, 0)
    assert add_duration(base, "1m") == datetime(2026, 7, 15, 12, 0, 0)

    # 1m is a calendar month, so the day clamps instead of overflowing
    assert add_duration(datetime(2025, 1, 31, 9, 0), "1m") == datetime(2025, 2, 28, 9, 0)
    assert add_duration(datetime(2024, 1, 31, 9, 0), "1m") == datetime(2024, 2, 29, 9, 0)
    assert add_duration(datetime(2025, 12, 20, 9, 0), "1m") == datetime(2026, 1, 20, 9, 0)

    with pytest.raises(Exception) as exc:
        add_duration(base, "5y")
    assert exc.value.status_code == 400

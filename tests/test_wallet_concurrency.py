"""One balance, two simultaneous rental requests: exactly one may take it.

The wallet used to read the balance, decide it was enough, and write the new
number - three steps, no lock, so two requests that started a millisecond
apart both read 100, both concluded 60 fit, and both wrote 40. The money was
then spent twice. These tests hold the fix to account: the compare-and-swap
guard in the repository, and money arithmetic done in Decimal rather than in
binary floating point.
"""

import asyncio

import pytest
from fastapi import HTTPException
from sqlalchemy import update

from app.core.config import get_settings
from app.models.wallet import Wallet
from app.repositories.wallet import WalletRepository
from app.services.wallet import WalletService, money_d


@pytest.fixture(autouse=True)
def wallet_on(monkeypatch):
    """The shipped switch is off; the ledger under test must be the real one."""
    monkeypatch.setattr(get_settings(), "WALLET_ENABLED", True)


async def _set_balance(user_id: int, balance: str, held: str = "0.00") -> None:
    """Seed the wallet and commit it, so the two writers below race over *money*
    rather than over who gets to create the row first."""
    from conftest import TestSessionLocal

    async with TestSessionLocal() as session:
        await WalletService(session).get_or_create(user_id)
        await session.execute(
            update(Wallet)
            .where(Wallet.user_id == user_id)
            .values(balance=money_d(balance), held=money_d(held))
        )
        await session.commit()


async def _balance_of(user_id: int) -> tuple:
    from conftest import TestSessionLocal

    async with TestSessionLocal() as session:
        summary = await WalletService(session).summary(user_id)
        return summary["balance"], summary["held"]


async def _seed_requests(renter_id: int, count: int = 2) -> list[int]:
    """Two real rental requests.

    A hold writes a ledger row that points at the request it was taken for,
    and that pointer is a foreign key - so the money cannot move against a
    request that does not exist. The rows are written straight to the database
    here: what is under test is the wallet, not the listing form.
    """
    import uuid
    from datetime import date, timedelta

    from conftest import TestSessionLocal, _ensure_user
    from app.core.enums import UserRole
    from app.models.category import Category
    from app.models.city import City
    from app.models.listing import Listing
    from app.models.rental_request import RentalRequest

    owner_id, _ = await _ensure_user(
        "test_owner_wallet_race@rentflow.com", UserRole.OWNER
    )
    tag = uuid.uuid4().hex[:6]

    async with TestSessionLocal() as session:
        category = Category(name=f"Cat-{tag}")
        city = City(name=f"City-{tag}")
        session.add_all([category, city])
        await session.flush()

        listing = Listing(
            owner_id=owner_id,
            category_id=category.id,
            city_id=city.id,
            title=f"Listing-{tag}",
            price=100,
        )
        session.add(listing)
        await session.flush()

        start = date.today() + timedelta(days=1)
        request_ids: list[int] = []
        for index in range(count):
            request = RentalRequest(
                listing_id=listing.id,
                renter_id=renter_id,
                owner_id=owner_id,
                start_date=start,
                end_date=start + timedelta(days=1),
                total_days=1,
                total_price=100,
                message=f"race-{index}",
            )
            session.add(request)
            await session.flush()
            request_ids.append(request.id)

        await session.commit()
        return request_ids


async def _hold_in_its_own_transaction(user_id: int, amount: float, request_id: int):
    """A rental request the way the API runs it: its own session, committing
    as soon as it has decided."""
    from conftest import TestSessionLocal

    async with TestSessionLocal() as session:
        try:
            result = await WalletService(session).hold(
                user_id, amount, rental_request_id=request_id
            )
            await session.commit()
            return result
        except Exception as exc:  # the refusal is the point of the test
            await session.rollback()
            return exc


async def test_two_simultaneous_holds_spend_the_balance_once(customer_id):
    await _set_balance(customer_id, "100.00")
    first_request, second_request = await _seed_requests(customer_id)

    results = await asyncio.gather(
        _hold_in_its_own_transaction(customer_id, 60, first_request),
        _hold_in_its_own_transaction(customer_id, 60, second_request),
    )

    accepted = [r for r in results if not isinstance(r, Exception)]
    refused = [r for r in results if isinstance(r, Exception)]

    assert len(accepted) == 1, "expected exactly one hold to land, got %d: %r" % (
        len(accepted),
        results,
    )
    assert len(refused) == 1
    assert isinstance(refused[0], HTTPException)
    assert refused[0].detail == "INSUFFICIENT_BALANCE"

    balance, held = await _balance_of(customer_id)
    assert balance == 40.0
    assert held == 60.0


async def test_a_stale_writer_cannot_overwrite_a_fresher_one(customer_id):
    """The guard itself: same read, later write, and the later write loses."""
    await _set_balance(customer_id, "100.00")

    from conftest import TestSessionLocal

    async with TestSessionLocal() as stale, TestSessionLocal() as fresh:
        stale_wallet = await WalletService(stale).get_or_create(customer_id)
        seen_balance, seen_held = money_d(stale_wallet.balance), money_d(stale_wallet.held)

        # Somebody else moves the money between the read and the write.
        await WalletService(fresh).topup(customer_id, 50)
        await fresh.commit()

        applied = await WalletRepository(stale).cas_wallet(
            customer_id,
            seen_balance,
            seen_held,
            seen_balance - 100,  # what the stale reader decided was left
            seen_held,
        )
        await stale.commit()

    assert applied is False, "a decision made on old numbers was allowed to land"

    balance, _ = await _balance_of(customer_id)
    assert balance == 150.0, "the concurrent top-up was overwritten"


async def test_money_is_arithmetically_exact(customer_id):
    """``0.1 + 0.2`` is 0.30000000000000004 in floats and 0.30 in money.

    The ledger is NUMERIC(12, 2); every figure it compares or reports has to
    be quantised first, or the drift decides who can afford what.
    """
    from conftest import TestSessionLocal

    await _set_balance(customer_id, "0.00")

    async with TestSessionLocal() as session:
        wallet_service = WalletService(session)
        for _ in range(10):
            await wallet_service.topup(customer_id, 0.1)
        summary = await wallet_service.summary(customer_id)
        await session.commit()

    assert summary["balance"] == 1.0, "ten top-ups of 0.1 did not add up to 1"
    assert float(money_d(0.1) + money_d(0.2)) == 0.3

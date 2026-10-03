"""The payment flow the site actually runs on.

RentHub's real journey is listing -> rental request -> owner accepts -> renter
pays. Payments used to be reachable only through an equipment booking, a flow
no screen in the product can even start, so `POST /payments` was dead code.
These tests pin down the new path: who may pay, when, for how much, and who
may say the money arrived.
"""
import uuid
from datetime import date, timedelta

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import PaymentStatus, PaymentType, RentalRequestStatus, UserRole
from app.models.category import Category
from app.models.city import City
from app.models.listing import Listing
from app.models.rental_request import RentalRequest
from app.models.user import User
from app.schemas.payment import PaymentCreate
from app.services.payment import PaymentService


# --------------------------------------------------------------------------
# schema — exactly one target
# --------------------------------------------------------------------------
def test_payment_needs_exactly_one_target():
    with pytest.raises(ValidationError):
        PaymentCreate(payment_type=PaymentType.BOOKING)
    with pytest.raises(ValidationError):
        PaymentCreate(
            booking_id=3,
            rental_request_id=5,
            amount=1,
            payment_type=PaymentType.BOOKING,
        )
    with pytest.raises(ValidationError):
        PaymentCreate(booking_id=3, payment_type=PaymentType.BOOKING)  # no amount


def test_payment_for_a_request_needs_no_amount_from_the_client():
    """The price is the request's, so the client is free to omit it."""
    data = PaymentCreate(rental_request_id=9, payment_type=PaymentType.BOOKING)
    assert data.booking_id is None
    assert data.amount is None


def test_booking_payment_still_carries_its_amount():
    data = PaymentCreate(booking_id=4, amount=150, payment_type=PaymentType.DEPOSIT)
    assert data.rental_request_id is None
    assert data.amount == 150


# --------------------------------------------------------------------------
# fixtures
# --------------------------------------------------------------------------
async def _make_user(db: AsyncSession, tag: str) -> int:
    user = User(
        email=f"{tag}-{uuid.uuid4().hex[:8]}@rentflow.test",
        hashed_password="",
        external_user_id=str(uuid.uuid4()),
        role=UserRole.CUSTOMER,
    )
    db.add(user)
    await db.flush()
    return user.id


async def _seed_accepted_request(
    db: AsyncSession,
    renter_id: int,
    owner_id: int,
    status: RentalRequestStatus = RentalRequestStatus.ACCEPTED,
    total: float = 200.0,
    deposit: float = 0.0,
) -> RentalRequest:
    tag = uuid.uuid4().hex[:6]
    city = City(name=f"Тестшаҳр-{tag}")
    category = Category(name=f"Тест-категория-{tag}")
    db.add_all([city, category])
    await db.flush()

    listing = Listing(
        owner_id=owner_id,
        category_id=category.id,
        city_id=city.id,
        title=f"Эълон-{tag}",
        price=100,
    )
    db.add(listing)
    await db.flush()

    start = date.today() + timedelta(days=3)
    request = RentalRequest(
        listing_id=listing.id,
        renter_id=renter_id,
        owner_id=owner_id,
        start_date=start,
        end_date=start + timedelta(days=1),
        total_days=2,
        total_price=total,
        deposit_amount=deposit,
        status=status,
    )
    db.add(request)
    await db.flush()
    return request


# --------------------------------------------------------------------------
# paying
# --------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_renter_pays_for_the_accepted_request(db_session: AsyncSession, customer_id: int):
    owner_id = await _make_user(db_session, "owner")
    request = await _seed_accepted_request(db_session, customer_id, owner_id)

    payment = await PaymentService(db_session).create(
        customer_id,
        PaymentCreate(rental_request_id=request.id, payment_type=PaymentType.BOOKING),
    )

    assert payment.status == PaymentStatus.PENDING
    assert payment.rental_request_id == request.id
    assert payment.booking_id is None, "a request payment must not pretend to be a booking"
    assert float(payment.amount) == 200.0
    assert payment.transaction_id


@pytest.mark.asyncio
async def test_the_amount_cannot_be_chosen_by_the_client(db_session: AsyncSession, customer_id: int):
    owner_id = await _make_user(db_session, "owner")
    request = await _seed_accepted_request(db_session, customer_id, owner_id, total=750.0)

    payment = await PaymentService(db_session).create(
        customer_id,
        PaymentCreate(
            rental_request_id=request.id, amount=1.0, payment_type=PaymentType.BOOKING
        ),
    )
    assert float(payment.amount) == 750.0, "the client does not set the price"


@pytest.mark.asyncio
async def test_a_request_that_was_not_accepted_cannot_be_paid(
    db_session: AsyncSession, customer_id: int
):
    owner_id = await _make_user(db_session, "owner")
    request = await _seed_accepted_request(
        db_session, customer_id, owner_id, status=RentalRequestStatus.PENDING
    )

    with pytest.raises(HTTPException) as exc:
        await PaymentService(db_session).create(
            customer_id,
            PaymentCreate(rental_request_id=request.id, payment_type=PaymentType.BOOKING),
        )
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_nobody_can_pay_for_someone_elses_request(db_session: AsyncSession, customer_id: int):
    owner_id = await _make_user(db_session, "owner")
    stranger_id = await _make_user(db_session, "stranger")
    request = await _seed_accepted_request(db_session, customer_id, owner_id)

    with pytest.raises(HTTPException) as exc:
        await PaymentService(db_session).create(
            stranger_id,
            PaymentCreate(rental_request_id=request.id, payment_type=PaymentType.BOOKING),
        )
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_the_same_request_cannot_be_paid_twice(db_session: AsyncSession, customer_id: int):
    owner_id = await _make_user(db_session, "owner")
    request = await _seed_accepted_request(db_session, customer_id, owner_id)
    service = PaymentService(db_session)

    await service.create(
        customer_id,
        PaymentCreate(rental_request_id=request.id, payment_type=PaymentType.BOOKING),
    )
    with pytest.raises(HTTPException) as exc:
        await service.create(
            customer_id,
            PaymentCreate(rental_request_id=request.id, payment_type=PaymentType.BOOKING),
        )
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_the_deposit_is_its_own_payment_line(db_session: AsyncSession, customer_id: int):
    owner_id = await _make_user(db_session, "owner")
    request = await _seed_accepted_request(
        db_session, customer_id, owner_id, total=200.0, deposit=300.0
    )
    service = PaymentService(db_session)

    rent = await service.create(
        customer_id,
        PaymentCreate(rental_request_id=request.id, payment_type=PaymentType.BOOKING),
    )
    deposit = await service.create(
        customer_id,
        PaymentCreate(rental_request_id=request.id, payment_type=PaymentType.DEPOSIT),
    )

    assert (float(rent.amount), rent.payment_type) == (200.0, PaymentType.BOOKING)
    assert (float(deposit.amount), deposit.payment_type) == (300.0, PaymentType.DEPOSIT)
    assert rent.status == deposit.status == PaymentStatus.PENDING
    assert rent.id != deposit.id, "rent and deposit are two separate payments"


@pytest.mark.asyncio
async def test_paying_the_rent_does_not_lock_the_deposit_out(
    db_session: AsyncSession, customer_id: int
):
    owner_id = await _make_user(db_session, "owner")
    request = await _seed_accepted_request(
        db_session, customer_id, owner_id, total=200.0, deposit=300.0
    )
    service = PaymentService(db_session)

    await service.create(
        customer_id,
        PaymentCreate(rental_request_id=request.id, payment_type=PaymentType.BOOKING),
    )
    # the deposit is still open
    deposit = await service.create(
        customer_id,
        PaymentCreate(rental_request_id=request.id, payment_type=PaymentType.DEPOSIT),
    )
    assert deposit.status == PaymentStatus.PENDING

    # ...but the rent itself is still only collectable once
    with pytest.raises(HTTPException) as exc:
        await service.create(
            customer_id,
            PaymentCreate(rental_request_id=request.id, payment_type=PaymentType.BOOKING),
        )
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_a_deposit_cannot_be_invented_or_overridden(
    db_session: AsyncSession, customer_id: int
):
    owner_id = await _make_user(db_session, "owner")
    request = await _seed_accepted_request(db_session, customer_id, owner_id, deposit=300.0)

    payment = await PaymentService(db_session).create(
        customer_id,
        PaymentCreate(
            rental_request_id=request.id, amount=1.0, payment_type=PaymentType.DEPOSIT
        ),
    )
    assert float(payment.amount) == 300.0, "the client does not set the deposit either"


@pytest.mark.asyncio
async def test_a_listing_with_no_deposit_cannot_be_charged_one(
    db_session: AsyncSession, customer_id: int
):
    owner_id = await _make_user(db_session, "owner")
    request = await _seed_accepted_request(db_session, customer_id, owner_id, deposit=0.0)

    with pytest.raises(HTTPException) as exc:
        await PaymentService(db_session).create(
            customer_id,
            PaymentCreate(rental_request_id=request.id, payment_type=PaymentType.DEPOSIT),
        )
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_a_request_is_only_payable_as_rent_or_deposit(
    db_session: AsyncSession, customer_id: int
):
    owner_id = await _make_user(db_session, "owner")
    request = await _seed_accepted_request(db_session, customer_id, owner_id, deposit=50.0)

    for payment_type in (PaymentType.REFUND, PaymentType.DAMAGE, PaymentType.LATE_FEE):
        with pytest.raises(HTTPException) as exc:
            await PaymentService(db_session).create(
                customer_id,
                PaymentCreate(rental_request_id=request.id, payment_type=payment_type),
            )
        assert exc.value.status_code == 400, payment_type


# --------------------------------------------------------------------------
# confirming
# --------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_owner_confirms_the_payment_and_a_stranger_cannot(
    db_session: AsyncSession, customer_id: int
):
    owner_id = await _make_user(db_session, "owner")
    stranger_id = await _make_user(db_session, "stranger")
    request = await _seed_accepted_request(db_session, customer_id, owner_id)
    service = PaymentService(db_session)
    payment = await service.create(
        customer_id,
        PaymentCreate(rental_request_id=request.id, payment_type=PaymentType.BOOKING),
    )

    with pytest.raises(HTTPException) as exc:
        await service.confirm_payment_as(stranger_id, False, payment.id)
    assert exc.value.status_code == 403

    with pytest.raises(HTTPException) as exc:
        await service.confirm_payment_as(customer_id, False, payment.id)
    assert exc.value.status_code == 403, "the payer does not confirm their own payment"

    confirmed = await service.confirm_payment_as(owner_id, False, payment.id)
    assert confirmed.status == PaymentStatus.PAID


@pytest.mark.asyncio
async def test_admin_confirms_anything(db_session: AsyncSession, customer_id: int):
    owner_id = await _make_user(db_session, "owner")
    admin_id = await _make_user(db_session, "admin")
    request = await _seed_accepted_request(db_session, customer_id, owner_id)
    service = PaymentService(db_session)
    payment = await service.create(
        customer_id,
        PaymentCreate(rental_request_id=request.id, payment_type=PaymentType.BOOKING),
    )

    confirmed = await service.confirm_payment_as(admin_id, True, payment.id)
    assert confirmed.status == PaymentStatus.PAID


@pytest.mark.asyncio
async def test_an_already_paid_request_cannot_be_confirmed_again(
    db_session: AsyncSession, customer_id: int
):
    owner_id = await _make_user(db_session, "owner")
    request = await _seed_accepted_request(db_session, customer_id, owner_id)
    service = PaymentService(db_session)
    payment = await service.create(
        customer_id,
        PaymentCreate(rental_request_id=request.id, payment_type=PaymentType.BOOKING),
    )
    await service.confirm_payment_as(owner_id, False, payment.id)

    with pytest.raises(HTTPException) as exc:
        await service.confirm_payment_as(owner_id, False, payment.id)
    assert exc.value.status_code == 400


# --------------------------------------------------------------------------
# reading
# --------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_only_the_people_on_a_request_can_read_its_payments(
    db_session: AsyncSession, customer_id: int
):
    owner_id = await _make_user(db_session, "owner")
    stranger_id = await _make_user(db_session, "stranger")
    request = await _seed_accepted_request(db_session, customer_id, owner_id)
    service = PaymentService(db_session)
    await service.create(
        customer_id,
        PaymentCreate(rental_request_id=request.id, payment_type=PaymentType.BOOKING),
    )

    for reader in (customer_id, owner_id):
        rows = await service.payments_for_request(reader, False, request.id)
        assert len(rows) == 1

    with pytest.raises(HTTPException) as exc:
        await service.payments_for_request(stranger_id, False, request.id)
    assert exc.value.status_code == 403

    # an admin reads it too, and nobody reads a request that does not exist
    assert len(await service.payments_for_request(stranger_id, True, request.id)) == 1
    with pytest.raises(HTTPException) as exc:
        await service.payments_for_request(customer_id, False, 424242)
    assert exc.value.status_code == 404


# --------------------------------------------------------------------------
# the production schema itself — RentHub runs on SQLite, which has no
# ALTER TABLE ... DROP NOT NULL, so the migration has to rebuild the table
# --------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_sqlite_rebuild_makes_booking_id_nullable_without_losing_anything():
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    from app.core.migrations import _allow_payment_to_be_for_a_request

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as conn:
            await conn.execute(text(
                "CREATE TABLE payments ("
                " id INTEGER NOT NULL PRIMARY KEY,"
                " booking_id INTEGER NOT NULL,"
                " customer_id INTEGER NOT NULL,"
                " amount NUMERIC NOT NULL,"
                " payment_type VARCHAR(8) NOT NULL,"
                " status VARCHAR(8) NOT NULL,"
                " transaction_id VARCHAR(255),"
                " created_at TIMESTAMP NOT NULL)"
            ))
            await conn.execute(text(
                "CREATE INDEX ix_payments_booking_id ON payments (booking_id)"
            ))
            await conn.execute(text(
                "INSERT INTO payments VALUES "
                "(1, 7, 3, 100, 'BOOKING', 'PAID', 'tx-1', '2026-01-01')"
            ))
            # what _add_missing_columns does first
            await conn.execute(text(
                "ALTER TABLE payments ADD COLUMN rental_request_id INTEGER"
            ))

            assert await _allow_payment_to_be_for_a_request(conn, "sqlite") is True

            info = {
                r[1]: r for r in await conn.execute(text("PRAGMA table_info(payments)"))
            }
            assert info["booking_id"][3] == 0, "booking_id is still NOT NULL"
            assert "rental_request_id" in info

            row = (await conn.execute(text(
                "SELECT id, booking_id, customer_id, amount, transaction_id, "
                "rental_request_id FROM payments"
            ))).one()
            assert tuple(row) == (1, 7, 3, 100, "tx-1", None), "row was lost"

            idx = [
                r[0] for r in await conn.execute(text(
                    "SELECT name FROM sqlite_master WHERE type = 'index' "
                    "AND tbl_name = 'payments' AND sql IS NOT NULL"
                ))
            ]
            assert "ix_payments_booking_id" in idx, "indexes were not restored"

            # a second start-up must not rebuild anything
            assert (
                await _allow_payment_to_be_for_a_request(conn, "sqlite")
            ) is False
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_sqlite_rebuild_handles_a_table_that_never_got_the_new_column():
    """No ALTER first: the column is added by the rebuild itself."""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    from app.core.migrations import _allow_payment_to_be_for_a_request

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as conn:
            await conn.execute(text(
                "CREATE TABLE payments ("
                " id INTEGER NOT NULL PRIMARY KEY,"
                " booking_id INTEGER NOT NULL,"
                " customer_id INTEGER NOT NULL,"
                " amount NUMERIC NOT NULL,"
                " payment_type VARCHAR(8) NOT NULL,"
                " status VARCHAR(8) NOT NULL,"
                " transaction_id VARCHAR(255),"
                " created_at TIMESTAMP NOT NULL)"
            ))
            await conn.execute(text(
                "INSERT INTO payments VALUES "
                "(1, 7, 3, 100, 'BOOKING', 'PAID', 'tx-1', '2026-01-01')"
            ))

            assert await _allow_payment_to_be_for_a_request(conn, "sqlite") is True

            info = {
                r[1]: r for r in await conn.execute(text("PRAGMA table_info(payments)"))
            }
            assert "rental_request_id" in info
            assert info["booking_id"][3] == 0
            row = (await conn.execute(text(
                "SELECT booking_id, rental_request_id FROM payments"
            ))).one()
            assert tuple(row) == (7, None)
    finally:
        await engine.dispose()

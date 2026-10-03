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

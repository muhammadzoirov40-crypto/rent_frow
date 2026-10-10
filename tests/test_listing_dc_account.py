"""The DC wallet an owner types while posting a listing.

A person has one wallet however many listings they post, so the number never
belongs to the listing row: the form collects it, the service folds it into
the owner's profile, and the rental payment reads it back from there. Three
things are worth pinning down — that it lands on the user, that it never
becomes a column of its own, and that a form which omits the field cannot
silently wipe the number already on file.
"""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.city import City
from app.models.listing import Listing
from app.models.user import User
from app.schemas.listing import ListingCreate, ListingUpdate
from app.services.listing import ListingService


async def _payload(db: AsyncSession, **overrides) -> dict:
    tag = uuid.uuid4().hex[:6]
    city = City(name=f"Тестшаҳр-{tag}")
    category = Category(name=f"Тест-{tag}")
    db.add_all([city, category])
    await db.flush()
    payload = {
        "category_id": category.id,
        "city_id": city.id,
        "title": f"Эълон-{tag}",
        "price": 100.0,
    }
    payload.update(overrides)
    return payload


@pytest.mark.asyncio
async def test_a_wallet_typed_while_posting_lands_on_the_owner(
    db_session: AsyncSession, customer_id: int
):
    service = ListingService(db_session)
    payload = await _payload(db_session, dc_account="992900111222")

    await service.create(customer_id, ListingCreate(**payload))

    owner = await db_session.get(User, customer_id)
    assert owner.dc_account == "992900111222", (
        "the wallet belongs to the person, which is where the payment looks"
    )
    assert "dc_account" not in Listing.__table__.columns, (
        "one wallet per person, however many listings - not a listing column"
    )


@pytest.mark.asyncio
async def test_an_edit_that_omits_the_field_leaves_the_number_on_file(
    db_session: AsyncSession, customer_id: int
):
    """An edit form that never mentions the wallet must not clear it — only
    an explicit blank does."""
    service = ListingService(db_session)
    listing = await service.create(
        customer_id, ListingCreate(**await _payload(db_session, dc_account="992900111222"))
    )

    await service.update(listing.id, customer_id, ListingUpdate(title="Номи нав"))

    owner = await db_session.get(User, customer_id)
    assert owner.dc_account == "992900111222"


@pytest.mark.asyncio
async def test_a_blank_wallet_clears_it_and_a_new_one_stores(
    db_session: AsyncSession, customer_id: int
):
    service = ListingService(db_session)
    listing = await service.create(
        customer_id, ListingCreate(**await _payload(db_session, dc_account="992900111222"))
    )

    await service.update(listing.id, customer_id, ListingUpdate(dc_account="   "))
    await db_session.flush()
    owner = await db_session.get(User, customer_id)
    assert owner.dc_account is None, "blank means cleared, not 'leave alone'"

    await service.update(listing.id, customer_id, ListingUpdate(dc_account="993300444555"))
    await db_session.flush()
    await db_session.refresh(owner)
    assert owner.dc_account == "993300444555"


@pytest.mark.asyncio
async def test_posting_without_the_field_at_all_changes_nothing(
    db_session: AsyncSession, customer_id: int
):
    """Most listings are posted without the wallet being mentioned: that is
    not an error, it just leaves the owner to be asked another way."""
    service = ListingService(db_session)

    await service.create(customer_id, ListingCreate(**await _payload(db_session)))

    owner = await db_session.get(User, customer_id)
    assert owner.dc_account is None

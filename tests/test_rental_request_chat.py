"""A rental request opens the chat between *its own* two people.

``conversations.rental_request_id`` is a pointer, and a pointer can outlive
what it points at: remove a request and its id is free again, so the next
request created inherits it while the old conversation still claims it. That
had happened on the live server - a conversation between two other users
answered for a request it had nothing to do with, and every attempt to write
the rental line into it failed with ``403: Not a participant in this
conversation``. The request's own chat never got its history.

These tests pin down both halves of the fix: the wrong conversation is never
chosen, and the tag that pointed at it is cleared so it stops lying.
"""

import uuid
from datetime import date, timedelta

from conftest import TestSessionLocal, _ensure_user
from app.core.enums import UserRole
from app.models.category import Category
from app.models.city import City
from app.models.conversation import Conversation
from app.models.listing import Listing
from app.models.message import Message
from app.models.rental_request import RentalRequest
from app.services.rental_request import RentalRequestService


async def _seed_request_with_a_stale_tag(
    renter_id: int, owner_id: int, stranger_a: int, stranger_b: int
) -> tuple[int, int]:
    """A real request, plus somebody else's conversation claiming it.

    Rows are written straight to the database - what is under test is how a
    tag is read, not how a request is created.
    """
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
        request = RentalRequest(
            listing_id=listing.id,
            renter_id=renter_id,
            owner_id=owner_id,
            start_date=start,
            end_date=start + timedelta(days=1),
            total_days=1,
            total_price=100,
            message="chat-tag",
        )
        session.add(request)
        await session.flush()

        low, high = sorted((stranger_a, stranger_b))
        stranger_chat = Conversation(
            user1_id=low,
            user2_id=high,
            rental_request_id=request.id,
        )
        session.add(stranger_chat)
        await session.commit()
        return request.id, stranger_chat.id


async def _three_pairs(customer_id: int) -> tuple[int, int, int, int]:
    owner_id, _ = await _ensure_user("owner_chat_tag@rentflow.com", UserRole.OWNER)
    stranger_a, _ = await _ensure_user("stranger_a_chat_tag@rentflow.com", UserRole.CUSTOMER)
    stranger_b, _ = await _ensure_user("stranger_b_chat_tag@rentflow.com", UserRole.CUSTOMER)
    assert customer_id not in (owner_id, stranger_a, stranger_b)
    return owner_id, stranger_a, stranger_b


async def test_a_stale_tag_is_not_used_to_pick_the_conversation(db_session, customer_id):
    owner_id, stranger_a, stranger_b = await _three_pairs(customer_id)
    request_id, stranger_chat_id = await _seed_request_with_a_stale_tag(
        customer_id, owner_id, stranger_a, stranger_b
    )

    request = await db_session.get(RentalRequest, request_id)
    service = RentalRequestService(db_session)
    conv = await service._conversation(request)

    assert conv.id != stranger_chat_id, "the rental was routed into another pair's chat"
    assert {conv.user1_id, conv.user2_id} == {customer_id, owner_id}


async def test_the_stale_tag_is_cleared_so_it_stops_answering(db_session, customer_id):
    owner_id, stranger_a, stranger_b = await _three_pairs(customer_id)
    request_id, stranger_chat_id = await _seed_request_with_a_stale_tag(
        customer_id, owner_id, stranger_a, stranger_b
    )

    request = await db_session.get(RentalRequest, request_id)
    await RentalRequestService(db_session)._conversation(request)
    await db_session.flush()

    stranger_chat = await db_session.get(Conversation, stranger_chat_id)
    assert stranger_chat.rental_request_id is None


async def test_the_rental_line_lands_in_the_right_chat(db_session, customer_id):
    """The symptom that started this: ``403: Not a participant``."""
    owner_id, stranger_a, stranger_b = await _three_pairs(customer_id)
    request_id, stranger_chat_id = await _seed_request_with_a_stale_tag(
        customer_id, owner_id, stranger_a, stranger_b
    )

    request = await db_session.get(RentalRequest, request_id)
    service = RentalRequestService(db_session)
    conv = await service._conversation(request)
    await service._post_system(conv, customer_id, "rental request created")
    await db_session.flush()

    posted = (
        await db_session.execute(
            Message.__table__.select().where(Message.conversation_id == conv.id)
        )
    ).fetchall()
    assert [row.content for row in posted] == ["rental request created"]

    leaked = (
        await db_session.execute(
            Message.__table__.select().where(
                Message.conversation_id == stranger_chat_id
            )
        )
    ).fetchall()
    assert leaked == [], "the rental line reached a chat neither party is in"

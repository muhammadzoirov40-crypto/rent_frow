"""The profile screen's own fields, saved the way the screen sends them.

The phone field has always been on the profile screen and the screen has
always sent it, but the request schema never listed it. Pydantic drops
unknown fields, so the number vanished on the way in and the response handed
the old one straight back. The screen said "Profile updated successfully" and
showed a number that had not changed - a failure with no error in it, which
is the hardest kind to notice.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.user import UpdateProfileRequest
from app.services.auth import AuthService


def test_the_profile_request_schema_accepts_a_phone():
    """The root of it: the field the screen has always sent is a field now."""
    payload = UpdateProfileRequest.model_validate({"phone": "+992900000002"})
    assert payload.phone == "+992900000002"


@pytest.mark.asyncio
async def test_a_phone_saved_from_the_profile_is_the_one_on_file(
    db_session: AsyncSession, customer_id: int
):
    service = AuthService(db_session)

    saved = await service.update_profile(customer_id, phone="+992903334455")

    assert saved.phone == "+992903334455", (
        "the number the owner typed has to be the number the response - and "
        "therefore the screen - shows back"
    )


@pytest.mark.asyncio
async def test_a_request_that_omits_the_phone_leaves_it_alone(
    db_session: AsyncSession, customer_id: int
):
    """Partial means partial: editing a name must not wipe the number."""
    service = AuthService(db_session)
    await service.update_profile(customer_id, phone="+992903334455")

    unchanged = await service.update_profile(customer_id, display_name="Номи нав")

    assert unchanged.phone == "+992903334455", (
        "a client that sends only a name must not clear the phone on file"
    )


@pytest.mark.asyncio
async def test_every_field_the_screen_offers_is_writable(
    customer_client, customer_id: int
):
    """End to end, the way the profile screen actually calls it."""
    response = await customer_client.patch(
        "/api/v1/auth/profile",
        json={
            "display_name": "Муҳаммад Зоиров",
            "phone": "+992900000002",
            "dc_account": "992900111222",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()["data"]
    assert body["display_name"] == "Муҳаммад Зоиров"
    assert body["phone"] == "+992900000002", (
        "the phone came back as it went in - it was never saved before"
    )
    assert body["dc_account"] == "900111222", (
        "saved in the nine-digit form DC routes a transfer by, not the "
        "international one the owner typed"
    )

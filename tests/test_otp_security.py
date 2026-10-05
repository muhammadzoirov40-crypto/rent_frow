"""The login code: unpredictable to make, expensive to guess.

A six-digit code is only a lock if two things hold: the code cannot be
predicted from the codes around it, and an attacker cannot keep asking until
one works. Both used to be missing - ``random.randint`` and no attempt limit at
all - so this file pins the fix down: where the numbers come from, what happens
after too many wrong guesses, and that a legitimate user with a typo is still
let in.
"""

import inspect
import re

import pytest
from fastapi import HTTPException

from app.core.config import get_settings
from app.services import otp as otp_module
from app.services.otp import generate_otp, reset_rate_limits, save_otp, verify_otp


@pytest.fixture(autouse=True)
def clean_windows():
    """A rate limiter that survives between tests would fail the wrong test."""
    reset_rate_limits()
    yield
    reset_rate_limits()


# ---------------------------------------------------------------- generation
def test_the_code_comes_from_the_operating_system_rng(monkeypatch):
    """The generator must ask the CSPRNG, not the predictable PRNG.

    ``random`` is a Mersenne twister: show an attacker a few codes and they can
    rewind the state and read the next one off the stream, which turns a login
    into a formality. The test replaces ``secrets.randbelow`` with a known
    answer and asserts the code is built from it.
    """
    seen = {}

    def fake_randbelow(ceiling):
        seen["ceiling"] = ceiling
        return 432100

    monkeypatch.setattr(otp_module.secrets, "randbelow", fake_randbelow)

    assert generate_otp() == "532100"
    assert seen["ceiling"] == 900000  # exactly the six-digit space, no more
    assert "randint" not in inspect.getsource(otp_module)


def test_every_generated_code_is_a_full_six_digits():
    """No leading zeros, no short codes - the UI shows six boxes."""
    for _ in range(300):
        assert re.fullmatch(r"\d{6}", generate_otp())


# ---------------------------------------------------------------- guessing
async def test_wrong_codes_run_out_before_a_guesser_wins(db_session):
    settings = get_settings()
    email = "brute.force@example.com"
    real = generate_otp()
    await save_otp(db_session, email, real)
    await db_session.commit()

    refused_at = None
    for attempt in range(1, settings.OTP_VERIFY_MAX_WRONG + 2):
        try:
            accepted = await verify_otp(db_session, email, "000000")
        except HTTPException as exc:
            assert exc.status_code == 429
            assert exc.detail == "TOO_MANY_OTP_ATTEMPTS"
            refused_at = attempt
            break
        assert accepted is False, "a code nobody was sent came back valid"

    assert refused_at is not None, "guessing was never stopped"
    assert refused_at <= settings.OTP_VERIFY_MAX_WRONG


async def test_running_out_of_guesses_burns_the_real_code(db_session):
    """The limit must not merely pause the attacker in front of a live code."""
    settings = get_settings()
    email = "burn.code@example.com"
    real = generate_otp()
    await save_otp(db_session, email, real)
    await db_session.commit()

    with pytest.raises(HTTPException):
        for _ in range(settings.OTP_VERIFY_MAX_WRONG + 1):
            await verify_otp(db_session, email, "000000")
    await db_session.commit()

    # Take the counter away - it was what stopped them - and the code they were
    # aiming at has to already be dead.
    reset_rate_limits()
    assert await verify_otp(db_session, email, real) is False


async def test_a_typo_does_not_lock_out_a_real_user_and_a_code_is_single_use(
    db_session,
):
    """The other half of the limit: punish guessing, never a person."""
    settings = get_settings()
    email = "typo.user@example.com"
    real = generate_otp()
    await save_otp(db_session, email, real)
    await db_session.commit()

    for _ in range(settings.OTP_VERIFY_MAX_WRONG - 1):
        assert await verify_otp(db_session, email, "000000") is False

    assert await verify_otp(db_session, email, real) is True
    await db_session.commit()

    assert await verify_otp(db_session, email, real) is False, "a used code was replayed"


# ---------------------------------------------------------------- sending
async def test_one_email_cannot_ask_for_a_flood_of_codes(client, monkeypatch):
    """An address must not be able to turn the site into an email cannon."""
    monkeypatch.setattr("app.api.routes.auth.send_otp_email", lambda email, code: True)
    settings = get_settings()
    email = "flood.sender@example.com"

    for _ in range(settings.OTP_SEND_MAX):
        res = await client.post("/api/v1/auth/send-otp", json={"email": email})
        assert res.status_code == 200, res.text

    res = await client.post("/api/v1/auth/send-otp", json={"email": email})
    assert res.status_code == 429
    assert "TOO_MANY_OTP_REQUESTS" in res.text
    assert res.headers.get("Retry-After"), "a client is never told when to return"


async def test_one_ip_cannot_ask_for_codes_forever(client, monkeypatch):
    """Rotating the address must not bypass the send limit - the caller is
    counted too."""
    monkeypatch.setattr("app.api.routes.auth.send_otp_email", lambda email, code: True)
    monkeypatch.setattr(get_settings(), "OTP_SEND_IP_MAX", 3)

    for i in range(3):
        res = await client.post("/api/v1/auth/send-otp", json={"email": f"ip.{i}@example.com"})
        assert res.status_code == 200, res.text

    res = await client.post("/api/v1/auth/send-otp", json={"email": "ip.last@example.com"})
    assert res.status_code == 429

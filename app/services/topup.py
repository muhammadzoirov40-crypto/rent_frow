"""Asking DC City for money, and believing it when it says the money came.

The two halves never meet in the browser:

* :func:`prepare` turns an amount into a payment link plus one waiting row,
* :func:`settle` is what the webhook calls once the payment actually went
  through — and, until DC City registers that webhook, what an operator
  calls from the wallet after seeing the payment in their statement.

Both ways in share one function, so a top-up is credited exactly once no
matter which of them gets there first.

The link carries a random ``reference`` in ``f3`` and the renter's id in
``f2``, so a callback can always be matched to the exact top-up it belongs
to - and, because the reference is unique and the status is checked, settled
exactly once no matter how many times the provider retries.
"""

import json
import uuid
from datetime import datetime
from urllib.parse import urlencode

from fastapi import HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.wallet import TopupIntent
from app.services.wallet import WalletService, money

MAX_AMOUNT = 1_000_000.0
# how much a callback may differ from what we asked for before we refuse it
TOLERANCE = 0.01


def payment_url(user_id: int, amount: float, reference: str) -> str:
    """The DC City checkout link, in the parameter order the page expects.

    ``f2``/``f3`` are the free fields the provider passes through untouched,
    which is how "this payment belongs to this RentHub user" survives the
    trip to a page that knows nothing about us.
    """
    settings = get_settings()
    return settings.PAYDC_URL + "?" + urlencode(
        [
            ("a", settings.PAYDC_ACCOUNT),
            ("f1", settings.PAYDC_ARTICUL),
            ("c", settings.PAYDC_DESCRIPTION),
            ("s", "%0.2f" % money(amount)),
            ("f2", str(user_id)),
            ("f3", reference),
        ]
    )


async def prepare(db: AsyncSession, user_id: int, amount: float) -> dict:
    """Open a top-up: one waiting row and the link that will settle it."""
    amount = money(amount)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="BAD_AMOUNT")
    if amount > MAX_AMOUNT:
        raise HTTPException(status_code=400, detail="AMOUNT_TOO_LARGE")

    settings = get_settings()
    if not settings.PAYDC_ENABLED:
        raise HTTPException(status_code=400, detail="TOPUP_DISABLED")

    reference = uuid.uuid4().hex[:24].upper()
    intent = TopupIntent(user_id=user_id, amount=amount, reference=reference)
    db.add(intent)
    await db.flush()

    return {
        "reference": reference,
        "amount": amount,
        "status": intent.status,
        "provider": intent.provider,
        "url": payment_url(user_id, amount, reference),
        "created_at": intent.created_at,
    }


async def find(db: AsyncSession, reference: str) -> TopupIntent | None:
    """The one top-up a reference points at — the lookup shared by the
    callback, an operator confirming by hand, and anyone asking what a
    reference means."""
    result = await db.execute(
        select(TopupIntent).where(TopupIntent.reference == str(reference))
    )
    return result.scalar_one_or_none()


async def intents(db: AsyncSession, user_id: int, limit: int = 20) -> list[TopupIntent]:
    """The user's own top-ups, newest first — pending ones included, so the
    wallet can show what is still on its way."""
    result = await db.execute(
        select(TopupIntent)
        .where(TopupIntent.user_id == user_id)
        .order_by(desc(TopupIntent.created_at), desc(TopupIntent.id))
        .limit(limit)
    )
    return list(result.scalars().all())


async def settle(
    db: AsyncSession,
    *,
    reference: str | None,
    amount: float | None = None,
    raw: dict | None = None,
) -> tuple[bool, str]:
    """Put a confirmed payment into the wallet. Idempotent by construction.

    Returns ``(credited, reason)`` — a webhook retries are answered with
    ``ALREADY_PAID`` rather than a second credit, and a callback we cannot
    place is refused instead of guessed at.
    """
    if not reference:
        return False, "NO_REFERENCE"

    row = await find(db, reference)
    if row is None:
        return False, "UNKNOWN_REFERENCE"
    if row.status == "PAID":
        return False, "ALREADY_PAID"
    if amount is not None and abs(money(amount) - money(row.amount)) > TOLERANCE:
        # keep it PENDING: a corrected retry must still be able to settle it
        return False, "AMOUNT_MISMATCH"

    try:
        await WalletService(db).topup(
            row.user_id,
            money(row.amount),
            description="Пополнение — DC Wallet (%s)" % row.reference,
        )
    except HTTPException as exc:  # noqa: BLE001
        return False, str(getattr(exc, "detail", "TOPUP_FAILED"))

    row.status = "PAID"
    row.paid_at = datetime.utcnow()
    row.raw_response = json.dumps(raw, ensure_ascii=False)[:4000] if raw else None
    await db.flush()
    return True, "CREDITED"

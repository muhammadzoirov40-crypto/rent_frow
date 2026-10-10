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
from app.core.dc import normalize_dc_account
from app.models.wallet import TopupIntent
from app.services.wallet import WalletService, money

MAX_AMOUNT = 1_000_000.0
# how much a callback may differ from what we asked for before we refuse it
TOLERANCE = 0.01


def payment_url(user_id: int, amount: float, reference: str, account: str | None = None) -> str:
    """The DC City checkout link, in the parameter order the page expects.

    ``f2``/``f3`` are the free fields the provider passes through untouched,
    which is how "this payment belongs to this RentHub user" survives the
    trip to a page that knows nothing about us.

    ``account`` is the destination the money is collected under — the listing
    owner's own DC account for a rental, so the rent lands with them. Left
    unset (top-ups, TOP windows, or an owner who never registered an
    account) it falls back to the platform's merchant account, which is the
    only one guaranteed to be recognised, so a blank field can never break a
    checkout.

    Whatever the owner typed is reduced on the way out as well as on the way
    in: a wallet saved before that reduction existed still has to reach DC in
    the form DC routes by.
    """
    settings = get_settings()
    return settings.PAYDC_URL + "?" + urlencode(
        [
            ("a", normalize_dc_account(account) or settings.PAYDC_ACCOUNT),
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


async def open_promotion_intent(
    db: AsyncSession, *, user_id: int, promotion_id: int, amount: float
) -> dict:
    """The same waiting room as a balance top-up, bound to a TOP promotion.

    Identical reference, identical link, identical settle - the only
    difference is ``promotion_id``, which is how the callback knows the
    money buys a TOP window instead of adding to a balance.
    """
    amount = money(amount)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="BAD_AMOUNT")
    if amount > MAX_AMOUNT:
        raise HTTPException(status_code=400, detail="AMOUNT_TOO_LARGE")

    settings = get_settings()
    if not settings.PAYDC_ENABLED:
        raise HTTPException(status_code=400, detail="TOPUP_DISABLED")

    reference = uuid.uuid4().hex[:24].upper()
    intent = TopupIntent(
        user_id=user_id,
        amount=amount,
        reference=reference,
        promotion_id=promotion_id,
    )
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


async def open_payment_intent(
    db: AsyncSession, *, user_id: int, payment_id: int, amount: float
) -> dict:
    """The same waiting room again, bound to a rental payment.

    Identical reference, identical link, identical settle - the only
    difference is ``payment_id``, which is how the callback knows the money
    pays the rent (or the deposit) instead of adding to a balance or buying
    a TOP window.
    """
    amount = money(amount)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="BAD_AMOUNT")
    if amount > MAX_AMOUNT:
        raise HTTPException(status_code=400, detail="AMOUNT_TOO_LARGE")

    settings = get_settings()
    if not settings.PAYDC_ENABLED:
        raise HTTPException(status_code=400, detail="TOPUP_DISABLED")

    reference = uuid.uuid4().hex[:24].upper()
    intent = TopupIntent(
        user_id=user_id,
        amount=amount,
        reference=reference,
        payment_id=payment_id,
    )
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


async def pending_payment_intent(
    db: AsyncSession, payment_id: int
) -> TopupIntent | None:
    """The un-paid link already opened for this payment, if any - so a
    checkout that was opened, abandoned and needed again re-opens with its
    own reference instead of starting a second one."""
    result = await db.execute(
        select(TopupIntent).where(
            TopupIntent.payment_id == payment_id,
            TopupIntent.status == "PENDING",
        )
    )
    return result.scalars().first()


async def pending_promotion_intent(
    db: AsyncSession, promotion_id: int
) -> TopupIntent | None:
    """The un-paid link already opened for this promotion, if any - so a
    second click hands back the *same* link instead of a second waiting row."""
    result = await db.execute(
        select(TopupIntent).where(
            TopupIntent.promotion_id == promotion_id,
            TopupIntent.status == "PENDING",
        )
    )
    return result.scalars().first()


async def latest_promotion_intents(
    db: AsyncSession, promotion_ids: list[int]
) -> dict[int, TopupIntent]:
    """The newest intent per promotion, paid or not.

    Unlike :func:`pending_promotion_intent` this deliberately ignores the
    status: it is how a response learns the reference a DC payment was
    *made* under (confirming the operator needs it even after it settled),
    and how an admin confirm endpoint finds the reference to settle.
    """
    if not promotion_ids:
        return {}
    result = await db.execute(
        select(TopupIntent)
        .where(TopupIntent.promotion_id.in_(promotion_ids))
        .order_by(TopupIntent.created_at, TopupIntent.id)
    )
    newest: dict[int, TopupIntent] = {}
    for row in result.scalars().all():
        newest[row.promotion_id] = row  # ordered oldest first: the last wins
    return newest


async def latest_payment_intents(
    db: AsyncSession, payment_ids: list[int]
) -> dict[int, TopupIntent]:
    """The newest intent per rental payment, paid or not - how a response
    learns the reference a DC payment was made under, so the operator can
    match it in the statement and the renter can show it."""
    if not payment_ids:
        return {}
    result = await db.execute(
        select(TopupIntent)
        .where(TopupIntent.payment_id.in_(payment_ids))
        .order_by(TopupIntent.created_at, TopupIntent.id)
    )
    newest: dict[int, TopupIntent] = {}
    for row in result.scalars().all():
        newest[row.payment_id] = row  # ordered oldest first: the last wins
    return newest


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


async def _settle_promotion(db: AsyncSession, row: TopupIntent) -> str:
    """Hand a settled payment to the promotion it was opened for.

    Imported late on purpose: the promotion service builds its DC links with
    the helpers of this module, so it may not be loading while this one is.
    """
    from app.services.promotion import complete_dc_payment

    return await complete_dc_payment(db, promo_id=row.promotion_id)


async def _settle_payment(db: AsyncSession, row: TopupIntent) -> str:
    """Hand a settled payment to the rental payment it was opened for.

    Same late import for the same reason: the payment service may one day
    build DC links through this module, so the dependency stays one-way.
    "Already paid" here means the owner (or an operator) confirmed the row
    by hand while the callback was in flight - the intent still closes; the
    money is not counted twice.
    """
    from app.services.payment import PaymentService

    try:
        await PaymentService(db).confirm_payment(row.user_id, row.payment_id)
    except HTTPException as exc:  # noqa: BLE001
        detail = str(getattr(exc, "detail", "PAYMENT_FAILED"))
        if detail.startswith("Cannot confirm payment in"):
            return "ALREADY_PAID"
        return detail
    return "PAYMENT_PAID"


async def settle(
    db: AsyncSession,
    *,
    reference: str | None,
    amount: float | None = None,
    raw: dict | None = None,
) -> tuple[bool, str]:
    """Put a confirmed payment where it was headed. Idempotent by construction.

    Three destinations share this one function: a NULL ``promotion_id`` and
    NULL ``payment_id`` credit the wallet (``CREDITED``), a bound promotion
    activates the TOP window it was opened for (``PROMOTION_ACTIVATED`` /
    ``PROMOTION_PAID``), a bound payment marks the rental payment PAID
    (``PAYMENT_PAID``). Either way the intent closes once - a webhook retry
    is answered with ``ALREADY_PAID`` rather than a second credit, and a
    callback we cannot place is refused instead of guessed at.
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

    if row.promotion_id:
        # money for a TOP window, not for the balance. It arrived either way,
        # so the intent closes here; what the promotion does with it is its
        # own business (a promotion rejected mid-flight grants no window).
        reason = await _settle_promotion(db, row)
        row.status = "PAID"
        row.paid_at = datetime.utcnow()
        row.raw_response = json.dumps(raw, ensure_ascii=False)[:4000] if raw else None
        await db.flush()
        return reason in ("PROMOTION_ACTIVATED", "PROMOTION_PAID"), reason

    if row.payment_id:
        # money for a rental payment - the rent or the deposit - not for the
        # balance. It arrived either way, so the intent closes here; what the
        # payment does with it is its own business (a row confirmed by hand
        # in the meantime was already PAID, and still is).
        reason = await _settle_payment(db, row)
        row.status = "PAID"
        row.paid_at = datetime.utcnow()
        row.raw_response = json.dumps(raw, ensure_ascii=False)[:4000] if raw else None
        await db.flush()
        return reason == "PAYMENT_PAID", reason

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

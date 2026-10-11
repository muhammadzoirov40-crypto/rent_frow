"""The endpoint DC City calls back when a payment went through.

Open to the internet by definition, so it may not be talked into crediting
anyone: the shared secret must match (and is refused outright while it is
unset), the reference must be one we issued, and the amount must be the one
we asked for. Settlement itself is idempotent, so a provider that retries —
which they all do — credits once.
"""

import hmac
import json
from urllib.parse import parse_qsl

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.webhook import WebhookEventIn
from app.services import topup as topup_service
from app.services import webhook_events as webhook_event_service

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

# every name the callback might reasonably use, in preference order
REFERENCE_KEYS = ("f3", "reference", "ref", "invoice", "invoice_id", "order_id", "OrderId", "id")
AMOUNT_KEYS = ("s", "amount", "Amount", "sum", "total", "value")
STATUS_KEYS = ("status", "state", "result")
SECRET_KEYS = ("secret", "token", "key", "sign", "signature")
FAILED_STATES = {
    "fail", "failed", "error", "decline", "declined",
    "cancel", "cancelled", "denied", "reject", "rejected", "0",
}


async def read_payload(request: Request) -> dict:
    """JSON if they send JSON, a form if they send a form — without assuming
    python-multipart is installed for a body we have never seen before."""
    raw = await request.body()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except (ValueError, UnicodeDecodeError):
        pass
    return dict(parse_qsl(raw.decode("utf-8", "replace")))


def first(payload: dict, keys) -> str | None:
    for key in keys:
        value = payload.get(key)
        if value not in (None, ""):
            return str(value)
    return None


@router.post("/pay-dc")
async def pay_dc_callback(request: Request, db: AsyncSession = Depends(get_db)):
    settings = get_settings()

    # Deliberately no wallet gate here. What settles through this callback is
    # a TOP window (or, once wired, a rental payment) — neither touches a
    # balance, so a switched-off wallet has no business refusing money that
    # already arrived. A plain balance top-up that cannot land says so as
    # `settle`'s reason (WALLET_DISABLED), which still answers 200 instead
    # of a retry the provider can do nothing with.
    payload = await read_payload(request)

    # Nothing may be credited until DC City registers this endpoint with us
    # and hands over the secret. Saying so plainly beats a silent no-op.
    if not settings.PAYDC_WEBHOOK_SECRET:
        print("[paydc] webhook called but PAYDC_WEBHOOK_SECRET is unset", flush=True)
        raise HTTPException(status_code=503, detail="WEBHOOK_NOT_CONFIGURED")

    provided = request.headers.get("x-paydc-secret") or first(payload, SECRET_KEYS)
    if not provided or not hmac.compare_digest(
        str(provided).strip(), settings.PAYDC_WEBHOOK_SECRET
    ):
        print("[paydc] webhook refused: bad secret", flush=True)
        raise HTTPException(status_code=403, detail="BAD_SECRET")

    reference = first(payload, REFERENCE_KEYS)
    status = (first(payload, STATUS_KEYS) or "").strip().lower()
    if status in FAILED_STATES:
        print(f"[paydc] declined reference={reference} status={status}", flush=True)
        return {"ok": True, "credited": False, "reason": "DECLINED"}

    amount: float | None = None
    raw_amount = first(payload, AMOUNT_KEYS)
    if raw_amount is not None:
        try:
            amount = float(str(raw_amount).replace(",", "").strip())
        except ValueError:
            amount = None

    credited, reason = await topup_service.settle(
        db, reference=reference, amount=amount, raw=payload
    )
    print(
        f"[paydc] reference={reference} amount={amount} -> {reason}",
        flush=True,
    )
    return {"ok": True, "credited": credited, "reason": reason}


# --------------------------------------------------------------------------
# General event webhook  —  /webhooks/events (+ /payment and /rental aliases)
#
# A provider-agnostic, JSON intake that moves a payment or a rental forward.
# Verified by HMAC signature (or a bearer token), idempotent on redelivery,
# and it answers 200 the moment the status is settled - the in-app
# notifications are pushed by a background task so a slow push can never make
# a provider retry a callback that already succeeded.
# --------------------------------------------------------------------------
import json as _json


async def _handle_event_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession,
    expected_categories: set[str] | None = None,
) -> dict:
    settings = get_settings()

    # Nothing is read, let alone changed, until the endpoint is configured.
    # Shut rather than open beats a silent no-op an operator can trust.
    if not settings.WEBHOOK_SECRET:
        print("[webhook] called but WEBHOOK_SECRET is unset", flush=True)
        raise HTTPException(status_code=503, detail="WEBHOOK_NOT_CONFIGURED")

    raw = await request.body()
    if not webhook_event_service.verify_signature(raw, request.headers, settings.WEBHOOK_SECRET):
        print("[webhook] refused: bad signature", flush=True)
        raise HTTPException(status_code=403, detail="BAD_SIGNATURE")

    try:
        payload = _json.loads(raw or b"{}")
    except ValueError:
        payload = None
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="INVALID_JSON")

    try:
        event = WebhookEventIn.model_validate(payload)
    except Exception:  # noqa: BLE001 - pydantic ValidationError
        raise HTTPException(status_code=422, detail="INVALID_EVENT")

    if expected_categories and event.category not in expected_categories:
        raise HTTPException(
            status_code=400,
            detail="EXPECTED_" + "_".join(sorted(c.upper() for c in expected_categories)) + "_EVENT",
        )

    result = await webhook_event_service.process_event(db, event)

    # The status change is already flushed (and commits with this request);
    # the notifications are the heavy part and go to the background.
    for note in result.pop("notify", []) or []:
        background_tasks.add_task(webhook_event_service.deliver_notifications, [note])

    print(f"[webhook] event={event.event} id={event.id} -> {result}", flush=True)
    return result


@router.post("/events")
async def webhook_events(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """General event intake. Accepts any ``<category>.<action>`` event."""
    return await _handle_event_webhook(request, background_tasks, db)


@router.post("/payment")
async def webhook_payment(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Payment-only intake: only ``payment.*`` events are accepted."""
    return await _handle_event_webhook(request, background_tasks, db, {"payment"})


@router.post("/rental")
async def webhook_rental(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Rental-only intake: ``rental.*`` and ``rental_request.*`` events."""
    return await _handle_event_webhook(request, background_tasks, db, {"rental", "rental_request"})

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

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.services import topup as topup_service

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

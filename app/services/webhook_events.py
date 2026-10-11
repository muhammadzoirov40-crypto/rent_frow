"""The general event webhook: verify, dispatch, settle - exactly once.

This sits beside the DC-specific callback in ``routes/webhooks.py`` rather
than replacing it. That one speaks DC City's form-encoded dialect and only
credits a top-up; this one is provider-agnostic and moves the two things the
site actually cares about - a **payment** and a **rental** - forward from a
plain JSON body::

    {"event": "payment.succeeded", "id": "evt_123", "data": {"payment_id": 42}}

Three properties it is built around:

* **Verified.** A request must prove it knows ``WEBHOOK_SECRET`` - via an
  HMAC-SHA256 signature over the raw body, or a bearer token - before a single
  row is read. Unset secret means the intake is shut (503), not open.
* **Idempotent.** Providers retry. Every handler compares-and-moves: a payment
  already ``PAID`` is left alone, a rental already ``COMPLETED`` is left alone,
  and a late event can never drag a rental *backwards*. Re-delivery is a no-op
  that still answers 200.
* **Fail-closed, answer-fast.** The status change is small and happens inside
  the request (so it commits with it); the noisy side effect - building and
  pushing in-app notifications - is handed to a background task that cannot
  fail the webhook.
"""

from __future__ import annotations

import hashlib
import hmac
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import PaymentStatus, RentalRequestStatus, RentalStatus
from app.models.payment import Payment
from app.models.rental import Rental
from app.models.rental_request import RentalRequest
from app.repositories.audit_log import AuditLogRepository
from app.repositories.payment import PaymentRepository
from app.repositories.rental import RentalRepository
from app.repositories.rental_request import RentalRequestRepository
from app.schemas.webhook import WebhookEventIn

SIGNATURE_HEADER = "x-renthub-signature"


# --------------------------------------------------------------------------
# Signature
# --------------------------------------------------------------------------
def compute_signature(raw: bytes, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), raw, hashlib.sha256).hexdigest()


def verify_signature(raw: bytes, headers: Any, secret: str) -> bool:
    """True when the request proves it knows the shared secret.

    Two accepted proofs, both compared in constant time:

    * ``X-RentHub-Signature: sha256=<hex>`` (or a bare hex) - an HMAC over the
      exact raw bytes, so even a body a proxy re-serialises fails closed;
    * ``Authorization: Bearer <secret>`` - a static token, for a caller that
      would rather not implement HMAC.
    """
    sig = (headers.get(SIGNATURE_HEADER) or headers.get("x-signature") or "").strip()
    if sig.lower().startswith("sha256="):
        sig = sig[7:].strip()
    if sig:
        if hmac.compare_digest(sig.lower(), compute_signature(raw, secret)):
            return True

    auth = headers.get("authorization") or ""
    if auth[:7].lower() == "bearer ":
        if hmac.compare_digest(auth[7:].strip(), secret):
            return True
    return False


# --------------------------------------------------------------------------
# Dispatch
# --------------------------------------------------------------------------
async def process_event(db: AsyncSession, event: WebhookEventIn) -> dict[str, Any]:
    """Apply one *already verified* event and return a summary.

    The ``notify`` key holds the in-app notifications to deliver after the
    response; the route pops it so it never reaches the client.
    """
    category, action, data = event.category, event.action, event.data or {}

    if category == "payment":
        return await _handle_payment(db, action, data)
    if category == "rental_request":
        return await _handle_rental_request(db, action, data)
    if category == "rental":
        return await _handle_rental(db, action, data)

    # Acknowledge what we do not recognise rather than reject it: a provider
    # that starts sending a new event should not be met with a retry storm.
    return {
        "ok": True,
        "handled": False,
        "reason": "UNKNOWN_EVENT",
        "event": event.event,
        "notify": [],
    }


# --------------------------------------------------------------------------
# Payment
# --------------------------------------------------------------------------
async def _find_payment(db: AsyncSession, data: dict) -> Payment | None:
    repo = PaymentRepository(db)
    pid = data.get("payment_id") or data.get("paymentId") or data.get("id")
    if pid not in (None, ""):
        try:
            payment = await repo.get_by_id(int(pid))
        except (TypeError, ValueError):
            payment = None
        if payment is not None:
            return payment
    ref = data.get("reference") or data.get("transaction_id") or data.get("ref")
    if ref not in (None, ""):
        result = await db.execute(
            select(Payment).where(Payment.transaction_id == str(ref)).limit(1)
        )
        return result.scalars().first()
    return None


def _amount(payment: Payment) -> str:
    try:
        return f"{float(payment.amount):,.2f}"
    except Exception:  # noqa: BLE001 - display only
        return str(payment.amount)


def _customer_payment_note(payment: Payment, *, paid: bool) -> dict:
    if paid:
        return {
            "user_id": payment.customer_id,
            "title": "Пардохт қабул шуд",
            "message": f"Пардохти {_amount(payment)} сомонӣ қабул ва тасдиқ шуд.",
            "type": "payment_confirmed",
            "reference_id": payment.id,
            "reference_type": "payment",
            "data": {"payment_id": payment.id, "status": "PAID"},
        }
    return {
        "user_id": payment.customer_id,
        "title": "Пардохт ноком шуд",
        "message": f"Пардохти {_amount(payment)} сомонӣ иҷро нашуд. Лутфан дубора кӯшиш кунед.",
        "type": "payment_failed",
        "reference_id": payment.id,
        "reference_type": "payment",
        "data": {"payment_id": payment.id, "status": "FAILED"},
    }


async def _owner_payment_note(db: AsyncSession, payment: Payment) -> dict | None:
    request = payment.rental_request
    if request is None:
        return None
    return {
        "user_id": request.owner_id,
        "title": "Пардохти иҷора қабул шуд",
        "message": f"Рентер барои дархости иҷора пардохти {_amount(payment)} сомонӣ кард.",
        "type": "rental_payment_received",
        "reference_id": request.id,
        "reference_type": "rental_request",
        "data": {"payment_id": payment.id, "rental_request_id": request.id},
    }


async def _handle_payment(db: AsyncSession, action: str, data: dict) -> dict:
    payment = await _find_payment(db, data)
    if payment is None:
        return {"ok": True, "handled": False, "reason": "PAYMENT_NOT_FOUND", "notify": []}

    if action == "succeeded":
        if payment.status == PaymentStatus.PAID:
            # Already settled - a provider retry is a no-op.
            return {
                "ok": True, "handled": True, "changed": False,
                "payment_id": payment.id, "status": "PAID", "notify": [],
            }
        old = payment.status.value
        payment.status = PaymentStatus.PAID
        ref = data.get("reference") or data.get("transaction_id")
        if ref not in (None, ""):
            payment.transaction_id = str(ref)
        await db.flush()
        await AuditLogRepository(db).create(
            user_id=payment.customer_id,
            action="payment_completed",
            entity_type="payment",
            entity_id=payment.id,
            old_data={"status": old},
            new_data={"status": PaymentStatus.PAID.value, "via": "webhook"},
        )
        notify = [_customer_payment_note(payment, paid=True)]
        owner_note = await _owner_payment_note(db, payment)
        if owner_note:
            notify.append(owner_note)
        return {
            "ok": True, "handled": True, "changed": True,
            "payment_id": payment.id, "status": "PAID", "notify": notify,
        }

    if action == "failed":
        if payment.status in (PaymentStatus.PAID, PaymentStatus.FAILED):
            return {
                "ok": True, "handled": True, "changed": False,
                "payment_id": payment.id, "status": payment.status.value, "notify": [],
            }
        old = payment.status.value
        payment.status = PaymentStatus.FAILED
        await db.flush()
        await AuditLogRepository(db).create(
            user_id=payment.customer_id,
            action="payment_failed",
            entity_type="payment",
            entity_id=payment.id,
            old_data={"status": old},
            new_data={"status": PaymentStatus.FAILED.value, "via": "webhook"},
        )
        return {
            "ok": True, "handled": True, "changed": True,
            "payment_id": payment.id, "status": "FAILED",
            "notify": [_customer_payment_note(payment, paid=False)],
        }

    return {"ok": True, "handled": False, "reason": "UNKNOWN_PAYMENT_ACTION", "notify": []}


# --------------------------------------------------------------------------
# Rental request
# --------------------------------------------------------------------------
_REQUEST_ACTION_STATUS = {
    "accepted": RentalRequestStatus.ACCEPTED,
    "rejected": RentalRequestStatus.REJECTED,
    "cancelled": RentalRequestStatus.CANCELLED,
    "canceled": RentalRequestStatus.CANCELLED,
    "completed": RentalRequestStatus.COMPLETED,
}
# Once a request is in one of these it is final; a late event may not reopen it.
_TERMINAL_REQUEST = {
    RentalRequestStatus.REJECTED,
    RentalRequestStatus.CANCELLED,
    RentalRequestStatus.COMPLETED,
}


async def _find_request(db: AsyncSession, data: dict) -> RentalRequest | None:
    repo = RentalRequestRepository(db)
    rid = data.get("request_id") or data.get("rental_request_id") or data.get("id")
    if rid in (None, ""):
        return None
    try:
        return await repo.get_by_id(int(rid))
    except (TypeError, ValueError):
        return None


def _request_note(request: RentalRequest, target: RentalRequestStatus) -> dict:
    verb = {
        RentalRequestStatus.ACCEPTED: "қабул шуд",
        RentalRequestStatus.REJECTED: "рад шуд",
        RentalRequestStatus.CANCELLED: "беҳтар карда шуд",
        RentalRequestStatus.COMPLETED: "анҷом ёфт",
    }.get(target, target.value.lower())
    return {
        "user_id": request.renter_id,
        "title": f"Дархости иҷора {verb}",
        "message": f"Дархости иҷоратон {verb}.",
        "type": f"rental_request_{target.value.lower()}",
        "reference_id": request.id,
        "reference_type": "rental_request",
        "data": {"rental_request_id": request.id, "status": target.value},
    }


async def _handle_rental_request(db: AsyncSession, action: str, data: dict) -> dict:
    target = _REQUEST_ACTION_STATUS.get(action)
    if target is None:
        return {"ok": True, "handled": False, "reason": "UNKNOWN_REQUEST_ACTION", "notify": []}

    request = await _find_request(db, data)
    if request is None:
        return {"ok": True, "handled": False, "reason": "REQUEST_NOT_FOUND", "notify": []}

    if request.status == target:
        return {
            "ok": True, "handled": True, "changed": False,
            "request_id": request.id, "status": target.value, "notify": [],
        }
    if request.status in _TERMINAL_REQUEST:
        # Final already - a stale replay must not reopen or flip it.
        return {
            "ok": True, "handled": True, "changed": False, "reason": "ALREADY_FINAL",
            "request_id": request.id, "status": request.status.value, "notify": [],
        }

    old = request.status.value
    request.status = target
    await db.flush()
    await AuditLogRepository(db).create(
        user_id=request.renter_id,
        action=f"rental_request_{action}",
        entity_type="rental_request",
        entity_id=request.id,
        old_data={"status": old},
        new_data={"status": target.value, "via": "webhook"},
    )
    return {
        "ok": True, "handled": True, "changed": True,
        "request_id": request.id, "status": target.value,
        "notify": [_request_note(request, target)],
    }


# --------------------------------------------------------------------------
# Rental
# --------------------------------------------------------------------------
_RENTAL_ACTION_STATUS = {
    "picked_up": RentalStatus.PICKED_UP,
    "pickup": RentalStatus.PICKED_UP,
    "active": RentalStatus.ACTIVE,
    "returned": RentalStatus.RETURNED,
    "return": RentalStatus.RETURNED,
    "completed": RentalStatus.COMPLETED,
}

# The forward direction of a rental's life. A late or replayed event must never
# drag a rental backwards along this line.
_RENTAL_ORDER = [
    RentalStatus.RESERVED,
    RentalStatus.PICKED_UP,
    RentalStatus.ACTIVE,
    RentalStatus.RETURN_REQUESTED,
    RentalStatus.RETURNED,
    RentalStatus.INSPECTING,
    RentalStatus.COMPLETED,
]


def _rental_rank(status: RentalStatus) -> int:
    try:
        return _RENTAL_ORDER.index(status)
    except ValueError:
        return -1


async def _find_rental(db: AsyncSession, data: dict) -> Rental | None:
    repo = RentalRepository(db)
    rid = data.get("rental_id") or data.get("id")
    if rid not in (None, ""):
        try:
            rental = await repo.get_by_id(int(rid))
        except (TypeError, ValueError):
            rental = None
        if rental is not None:
            return rental
    bid = data.get("booking_id")
    if bid not in (None, ""):
        try:
            return await repo.get_by_booking_id(int(bid))
        except (TypeError, ValueError):
            return None
    return None


async def _handle_rental(db: AsyncSession, action: str, data: dict) -> dict:
    target = _RENTAL_ACTION_STATUS.get(action)
    if target is None:
        return {"ok": True, "handled": False, "reason": "UNKNOWN_RENTAL_ACTION", "notify": []}

    rental = await _find_rental(db, data)
    if rental is None:
        return {"ok": True, "handled": False, "reason": "RENTAL_NOT_FOUND", "notify": []}

    if rental.status == target:
        return {
            "ok": True, "handled": True, "changed": False,
            "rental_id": rental.id, "status": target.value, "notify": [],
        }
    if _rental_rank(target) < _rental_rank(rental.status):
        return {
            "ok": True, "handled": True, "changed": False, "reason": "STALE_EVENT",
            "rental_id": rental.id, "status": rental.status.value, "notify": [],
        }

    old = rental.status.value
    rental.status = target
    if target == RentalStatus.PICKED_UP and rental.pickup_at is None:
        rental.pickup_at = datetime.utcnow()
    if target == RentalStatus.RETURNED and rental.returned_at is None:
        rental.returned_at = datetime.utcnow()
    await db.flush()
    await AuditLogRepository(db).create(
        user_id=rental.customer_id,
        action=f"rental_{action}",
        entity_type="rental",
        entity_id=rental.id,
        old_data={"status": old},
        new_data={"status": target.value, "via": "webhook"},
    )

    notify: list[dict] = []
    if target == RentalStatus.COMPLETED:
        notify.append({
            "user_id": rental.customer_id,
            "title": "Иҷора анҷом ёфт",
            "message": "Иҷораи шумо ба охир расид. Ташаккур!",
            "type": "rental_completed",
            "reference_id": rental.id,
            "reference_type": "rental",
            "data": {"rental_id": rental.id, "status": "COMPLETED"},
        })

    return {
        "ok": True, "handled": True, "changed": True,
        "rental_id": rental.id, "status": target.value, "notify": notify,
    }


# --------------------------------------------------------------------------
# Background delivery
# --------------------------------------------------------------------------
async def deliver_notifications(notes: list[dict]) -> None:
    """Push in-app notifications on their own session, after the response.

    Best effort by design: the payment/rental state is already settled and
    committed, so a failure here must never turn a provider's successful
    callback into a retry. One bad note is skipped, the rest still go out.
    """
    if not notes:
        return

    from app.core.database import async_session_factory
    from app.services.notification import NotificationService

    async with async_session_factory() as session:
        service = NotificationService(session)
        for note in notes:
            try:
                await service.create(
                    user_id=note["user_id"],
                    title=note["title"],
                    message=note["message"],
                    type=note["type"],
                    reference_id=note.get("reference_id"),
                    reference_type=note.get("reference_type"),
                    data=note.get("data"),
                )
            except Exception:  # noqa: BLE001 - keep going, never fail the webhook
                continue
        try:
            await session.commit()
        except Exception:  # noqa: BLE001
            pass

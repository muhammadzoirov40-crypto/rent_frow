"""Rental deadline notices (in-app + email), mirroring `listing_expiry`.

An in-process asyncio loop started from `main.py` — no Celery: the tasks in
`app/workers` are scaffolding nothing consumes, and the listing loop already
proves a plain async loop survives in this service.

`rental_requests.end_date` is a DATE, so the deadlines are pinned to Dushanbe
wall-clock time (Asia/Dushanbe = UTC+5, fixed, no DST): a rental runs through
24:00 of its last day. The codebase's convention is naive `datetime.utcnow()`,
so in those terms:

  * reminder — 23:00 Dushanbe = 18:00 UTC on `end_date`  ("1 hour left")
  * expiry   — 24:00 Dushanbe = 19:00 UTC on `end_date`  ("period over")

Deduplication without a schema change: the in-app notification row IS the
marker — at most one `rental_ending_soon` and one `rental_ended` row per
request, and the emails ride along on the same pass. `FRESH_DAYS` keeps a
restarted service from mailing every old rental in the table.
"""

import asyncio
import logging
from datetime import date, datetime, time, timedelta

from sqlalchemy import select

from app.core.database import async_session_factory
from app.core.enums import RentalRequestStatus
from app.models.conversation import Conversation
from app.models.notification import Notification
from app.models.rental_request import RentalRequest
from app.services import email as mailer
from app.services.notification import NotificationService

logger = logging.getLogger("rentflow.rental_expiry")

CHECK_INTERVAL_SECONDS = 300  # 5 min — the reminder window is only 1 hour wide
FIRST_RUN_DELAY_SECONDS = 90  # let the API finish booting first
FRESH_DAYS = 1  # only rentals ending today/yesterday qualify

DUSHANBE_OFFSET = timedelta(hours=5)  # Asia/Dushanbe — fixed, no DST

ENDING_TYPE = "rental_ending_soon"
ENDED_TYPE = "rental_ended"


def deadlines(end_date: date) -> tuple[datetime, datetime]:
    """(reminder_at, expiry_at) as naive UTC datetimes for `end_date`."""
    expiry = datetime.combine(end_date + timedelta(days=1), time(0, 0)) - DUSHANBE_OFFSET
    return expiry - timedelta(hours=1), expiry


async def _already_notified(db, ntype: str, request_ids: list[int]) -> set[int]:
    rows = await db.execute(
        select(Notification.reference_id).where(
            Notification.type == ntype,
            Notification.reference_type == "rental_request",
            Notification.reference_id.in_(request_ids),
        )
    )
    return {int(rid) for (rid,) in rows.all() if rid is not None}


async def _conversation_id(db, request_id: int) -> int | None:
    row = await db.execute(
        select(Conversation.id)
        .where(Conversation.rental_request_id == request_id)
        .limit(1)
    )
    return row.scalar_one_or_none()


async def check_rental_deadlines(session_factory=None) -> int:
    """Send the two deadline notices. Returns the number of requests handled."""
    factory = session_factory or async_session_factory
    now = datetime.utcnow()
    async with factory() as db:
        result = await db.execute(
            select(RentalRequest).where(
                RentalRequest.status == RentalRequestStatus.ACCEPTED,
                RentalRequest.end_date >= now.date() - timedelta(days=FRESH_DAYS),
            )
        )
        requests = list(result.scalars().all())
        if not requests:
            return 0

        ids = [r.id for r in requests]
        ending_done = await _already_notified(db, ENDING_TYPE, ids)
        ended_done = await _already_notified(db, ENDED_TYPE, ids)

        notif = NotificationService(db)
        handled = 0
        for req in requests:
            reminder_at, expiry_at = deadlines(req.end_date)
            if now < reminder_at:
                continue
            is_ended = now >= expiry_at
            ntype = ENDED_TYPE if is_ended else ENDING_TYPE
            done = ended_done if is_ended else ending_done
            if req.id in done:
                continue

            conv_id = await _conversation_id(db, req.id)
            listing_title = req.listing.title if req.listing else "—"
            data = {
                "listing_id": req.listing_id,
                "listing_title": listing_title,
                "request_id": req.id,
                "end_date": req.end_date.isoformat(),
            }
            title = "Rental period over" if is_ended else "Rental ending soon"
            message = (
                f'The rental of "{listing_title}" has ended. '
                "Reach out in the chat if the item was not returned."
                if is_ended
                else f'The rental of "{listing_title}" ends today at 23:59 (Dushanbe time).'
            )

            # In-app rows first — they double as the "already sent" markers.
            for user_id in {req.renter_id, req.owner_id}:
                await notif.create(
                    user_id=user_id,
                    title=title,
                    message=message,
                    type=ntype,
                    reference_id=req.id,
                    reference_type="rental_request",
                    data=data,
                )
            await db.commit()

            # Then the emails — best effort, exactly like the rental flow's.
            for person in (req.renter, req.owner):
                if not person:
                    continue
                name = person.display_name or (person.email or "there").split("@")[0]
                if is_ended:
                    template = mailer.rental_ended(
                        name=name,
                        listing_title=listing_title,
                        end_date=req.end_date,
                        conversation_id=conv_id,
                    )
                else:
                    template = mailer.rental_ending_soon(
                        name=name,
                        listing_title=listing_title,
                        end_date=req.end_date,
                        conversation_id=conv_id,
                    )
                mailer.send_in_background(getattr(person, "email", None), template)

            if is_ended:
                ended_done.add(req.id)
            else:
                ending_done.add(req.id)
            handled += 1

    if handled:
        logger.info("Rental deadline notices sent for %d request(s)", handled)
    return handled


async def run_rental_expiry_loop() -> None:
    print(f"[rental-expiry] loop started (every {CHECK_INTERVAL_SECONDS}s)", flush=True)
    await asyncio.sleep(FIRST_RUN_DELAY_SECONDS)
    while True:
        try:
            await check_rental_deadlines()
        except Exception:
            logger.exception("Rental deadline check failed")
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)

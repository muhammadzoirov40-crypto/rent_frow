"""RentHub's own voice inside a chat.

A rental request, an acceptance or a rejection is not something a person typed,
so it is written as a system message: the very same `messages` row, tagged with
`SYSTEM_PREFIX` so the chat renders it as a centred chip instead of a bubble
attributed to whoever happened to trigger it.

`SYSTEM_PREFIX` is mirrored in `frontend/src/components/chat/messageContent.ts`
— keep both copies in sync.
"""

SYSTEM_PREFIX = "[system]"


def is_system(content: str | None) -> bool:
    return bool(content) and content.startswith(SYSTEM_PREFIX)


def strip_prefix(content: str | None) -> str:
    if not content:
        return ""
    return content[len(SYSTEM_PREFIX):].lstrip() if is_system(content) else content


def wrap(text: str) -> str:
    return f"{SYSTEM_PREFIX} {text}"


def money(value) -> str:
    """240.0 -> '240', 150.5 -> '150.5'."""
    return f"{float(value):g}"


def request_created(*, listing_title: str, start_date, end_date, days: int, total, note: str | None = None) -> str:
    line = (
        f'Rental request for "{listing_title}": {start_date} — {end_date} '
        f"· {days} days · {money(total)} сомони · awaiting owner confirmation."
    )
    if note and note.strip():
        # The renter's own words (the "place of rent" note typed in the booking
        # card) ride along so the owner reads the feedback inside the chat.
        clean = " ".join(note.split())
        if len(clean) > 140:
            clean = clean[:137] + "..."
        line += f" Note: {clean}"
    return wrap(line)


def request_accepted(*, listing_title: str, start_date, end_date, days: int, total) -> str:
    return wrap(
        f'Rental confirmed for "{listing_title}": {start_date} — {end_date} '
        f"· {days} days · {money(total)} сомони."
    )


def request_rejected(*, listing_title: str, reason: str | None = None) -> str:
    text = f'The owner declined the rental request for "{listing_title}".'
    if reason:
        text += f" Reason: {reason}"
    return wrap(text)


def request_cancelled(*, listing_title: str) -> str:
    return wrap(f'The renter cancelled the rental request for "{listing_title}".')

"""One way to attach a payment receipt, used by every place money is waited for.

Paying at DC Wallet (Dushanbe City) ends with a receipt in the customer's
hand, and the operator wants to see it next to the reference wherever the
money is headed: a TOP window, a balance top-up, a rental payment. All three
used to decide for themselves what a receipt is, and only one of them
existed — so this module is the single answer to three questions:

* **who** may attach — the row's own owner, or an admin, and only while the
  money is still outstanding (once settled there is nothing left to prove),
* **what** may be attached — the same picture types and the same 10 MB
  ceiling post images have, checked before a byte is stored,
* **where** it goes — the same storage as post images, keyed and never
  handed out as a permanent URL.

The routes stay thin on purpose: each owns its own row, this owns the rules
that do not depend on which row it is.
"""

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import UserRole
from app.models.user import User
from app.repositories.user import UserRepository
from app.services.notification import NotificationService
from app.utils.s3 import upload_file

import logging

logger = logging.getLogger(__name__)

# The same picture types and the same ceiling as post images and the TOP
# receipt — a customer who can upload a photo anywhere can upload one here.
CHECK_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_CHECK_SIZE = 10 * 1024 * 1024  # 10MB

# S3 prefixes per destination, so an operator browsing the bucket can tell a
# top-up receipt from a rental one without opening the file.
FOLDER_TOPUP = "topup_checks"
FOLDER_PAYMENT = "payment_checks"


async def read_check(file: UploadFile) -> tuple[bytes, str]:
    """Validate a receipt and return it whole, or refuse it.

    Type first, size second: refusing on the type costs no read of a file we
    were never going to store, and the size check happens on the bytes we
    already hold rather than trusting a header the client chose.
    """
    if file.content_type not in CHECK_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid file type. Allowed: JPG, JPEG, PNG, WebP. "
                f"Got: {file.content_type}"
            ),
        )
    file_bytes = await file.read()
    if len(file_bytes) > MAX_CHECK_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_CHECK_SIZE // (1024 * 1024)}MB.",
        )
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")
    return file_bytes, (file.filename or "check.jpg")


def store_check(file_bytes: bytes, folder: str, filename: str) -> str:
    """Put the receipt in storage and hand back its key.

    Only the key is returned, and only the key is ever persisted: storage
    keys are permanent, and the links built from them — in the response, in
    the admin panel — are the expiring kind.
    """
    return upload_file(
        file_bytes=file_bytes,
        folder=folder,
        filename=filename,
        content_type="image/jpeg",
    )


# Which of the three money flows a receipt belongs to, as the notification
# UI reads it back: a code the client translates, so an operator sees their
# own language instead of an English phrase baked into the row.
SOURCE_TOP = "TOP"
SOURCE_WALLET = "WALLET"
SOURCE_RENTAL = "RENTAL"

_SOURCE_PHRASE = {
    SOURCE_TOP: "TOP promotion",
    SOURCE_WALLET: "balance top-up",
    SOURCE_RENTAL: "rental payment",
}


async def notify_admins(
    db: AsyncSession,
    *,
    source: str,
    payer_id: int,
    amount: float,
    reference: str | None = None,
    listing_title: str | None = None,
    reference_id: int | None = None,
) -> int:
    """Tell every operator a receipt just arrived, and where it came from.

    In-app rather than SMS: `NotificationService` writes the row and pushes
    it over the same websocket every other notification takes, so it is on
    an open admin's screen while the customer still has the upload window
    up. The payload carries the four things an operator matches a receipt
    against in the DC City statement — who paid, how much, under which
    reference, and for what — and `source` says which flow to look in.

    Best effort by construction: a notification that blows up is logged and
    never rolls back the upload it is about.
    """
    try:
        payer = (
            await db.execute(select(User).where(User.id == payer_id))
        ).scalar_one_or_none()
        payer_name = (
            (payer.display_name or payer.email) if payer else f"#{payer_id}"
        )
        admins = await UserRepository(db).get_by_role(UserRole.ADMIN)
    except Exception:
        logger.exception(
            "Could not prepare the receipt notification (source=%s payer=%s)",
            source,
            payer_id,
        )
        return 0

    phrase = _SOURCE_PHRASE.get(source, "payment")
    data: dict = {
        "source": source,
        "payer_id": payer_id,
        "user_name": payer_name,
        "amount": f"{float(amount):.2f}",
        "reference": reference or "",
    }
    if listing_title:
        data["listing_title"] = listing_title

    message = (
        f"{payer_name} sent a receipt for a {phrase} of {float(amount):.2f} somoni"
    )
    if reference:
        message += f" (reference {reference})"
    message += "."

    sent = 0
    for admin in admins:
        try:
            await NotificationService(db).create(
                user_id=admin.id,
                title="Payment receipt received",
                message=message,
                type="check_received",
                reference_id=reference_id,
                reference_type="payment_check",
                data=data,
            )
            sent += 1
        except Exception:
            logger.exception(
                "Receipt notification failed (admin=%s source=%s)", admin.id, source
            )
    return sent

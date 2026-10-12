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

from app.utils.s3 import upload_file

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

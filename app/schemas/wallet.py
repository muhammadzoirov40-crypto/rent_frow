from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import WalletTransactionType


class WalletSummary(BaseModel):
    """Available vs reserved, straight from the backend."""

    balance: float
    held: float
    total: float
    currency: str = "TJS"


class WalletTopUpRequest(BaseModel):
    amount: float = Field(..., gt=0, le=1_000_000)
    description: Optional[str] = None


class WalletTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: float
    held_amount: float
    type: WalletTransactionType
    rental_request_id: Optional[int] = None
    listing_title: Optional[str] = None
    description: Optional[str] = None
    balance_after: float
    held_after: float
    created_at: datetime


class TopupPrepareRequest(BaseModel):
    """How much the user wants to add — the link is built from it."""

    amount: float = Field(..., gt=0, le=1_000_000)


class TopupPrepareResponse(BaseModel):
    reference: str
    amount: float
    status: str
    provider: str = "paydc"
    url: str
    created_at: datetime


class TopupIntentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: float
    reference: str
    status: str
    provider: str
    created_at: datetime
    paid_at: Optional[datetime] = None
    # A fresh link to the receipt the customer attached after paying, the way
    # post images are handed out: the row stores the key, this stores a link
    # that expires. None until one is attached.
    check_image_url: Optional[str] = None


class AdminTopupResponse(BaseModel):
    """One row of the admin's \"who topped up\" list — every intent across all
    users, joined with the person who created it.

    ``settled_via`` and ``raw_response`` exist so the list answers the
    question the amount column cannot: *did this money actually arrive, and
    who says so*. ``amount`` is only what we asked for in the checkout link;
    the confirmation is the ``PAID`` stamp plus whatever the callback said,
    kept verbatim here rather than parsed into a form the admin cannot check
    against the provider's own statement.
    """

    id: int
    user_id: int
    user_name: str
    user_email: str
    amount: float
    reference: str
    status: str
    provider: str
    created_at: datetime
    paid_at: Optional[datetime] = None
    # "webhook" when the provider's callback closed it, "admin" when an
    # operator confirmed it by hand, None while nothing has confirmed it.
    # Derived from raw_response's `via` marker by the backend, never guessed
    # by the browser — "who stamped this paid" is a security fact.
    settled_via: Optional[str] = None
    # what the callback (or the operator's hand) actually said, untouched
    raw_response: Optional[str] = None
    # the receipt (screenshot) the customer attached after paying at DC —
    # a fresh expiring link, never the storage key. None until one arrives,
    # which for a still-PENDING row is the normal case.
    check_image_url: Optional[str] = None
    # the receipt (screenshot) the customer attached after paying — a fresh
    # link, because the row stores the key and keys must not leak as URLs.
    # None until one arrives, which for a still-PENDING row is the normal case.
    check_image_url: Optional[str] = None
    # where the money went, so "100 TJS" is never ambiguous about whose
    # 100 TJS it became: wallet balance, a TOP window, or a rental payment.
    promotion_id: Optional[int] = None
    payment_id: Optional[int] = None


class AdminTopupListResponse(BaseModel):
    """The top-up page plus the sums that only make sense over *all* rows,
    not over the current page — so they are computed server-side over the
    full table and cannot drift from pagination."""

    success: bool = True
    message: str = ""
    data: Optional[list[AdminTopupResponse]] = None
    total: int = 0
    page: int = 1
    page_size: int = 20
    # money that actually settled
    paid_total: float = 0.0
    paid_count: int = 0
    # money still waiting for the provider — not revenue, not spendable
    pending_total: float = 0.0
    pending_count: int = 0
    failed_total: float = 0.0
    failed_count: int = 0

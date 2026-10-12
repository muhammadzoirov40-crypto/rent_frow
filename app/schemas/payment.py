from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, model_validator
from app.core.enums import PaymentType, PaymentStatus


class PaymentCreate(BaseModel):
    """A payment is aimed at exactly one thing.

    The equipment-booking flow passes ``booking_id``; the flow the site
    actually runs on — listing -> rental request -> owner accepts — passes
    ``rental_request_id`` and may omit the amount, which is then taken from
    the request itself so a client cannot underpay. The third road passes
    ``listing_id``: a SALE listing bought outright, at the listing's own
    price — a buyer names no amount either, for the same reason.
    """

    booking_id: Optional[int] = None
    rental_request_id: Optional[int] = None
    listing_id: Optional[int] = None
    # Only the booking road reads this — the other two take their figure
    # from the request or the listing. The ceiling is what Numeric(10, 2),
    # the column the amount is written into, can hold: SQLite lets anything
    # through untouched, so without it a caller could pin 10**21 on a row
    # that the revenue sums are built from.
    amount: Optional[float] = Field(None, gt=0, le=99_999_999.99)
    payment_type: PaymentType
    transaction_id: Optional[str] = None

    @model_validator(mode="after")
    def _exactly_one_target(self) -> "PaymentCreate":
        targets = (self.booking_id, self.rental_request_id, self.listing_id)
        if sum(target is None for target in targets) != 2:
            raise ValueError(
                "exactly one of booking_id, rental_request_id or listing_id "
                "is required"
            )
        if self.booking_id is not None and self.amount is None:
            raise ValueError("amount is required when paying for a booking")
        return self


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: Optional[int] = None
    rental_request_id: Optional[int] = None
    listing_id: Optional[int] = None
    customer_id: int
    amount: float
    payment_type: PaymentType
    status: PaymentStatus
    transaction_id: Optional[str] = None
    created_at: datetime
    # the reference a DC checkout was opened under, when there is one: how
    # the operator matches this row in the statement and the renter shows
    # which payment they mean. Pinned by the routes that read payments.
    payment_reference: Optional[str] = None
    # A fresh link to the receipt the customer attached after paying. The row
    # stores the storage key; this is the expiring link built from it, so the
    # key itself never travels to the browser. None until one is attached.
    check_image_url: Optional[str] = None


class PaymentPayDc(BaseModel):
    """What opening a DC checkout hands back: the link to follow and the
    reference it carries, plus the still-PENDING payment it belongs to."""

    url: str
    reference: str
    payment: PaymentResponse


class PaymentConfirm(BaseModel):
    transaction_id: str = Field(..., min_length=1)

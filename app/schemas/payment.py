from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, model_validator
from app.core.enums import PaymentType, PaymentStatus


class PaymentCreate(BaseModel):
    """A payment is aimed at exactly one thing.

    The equipment-booking flow passes ``booking_id``; the flow the site
    actually runs on — listing -> rental request -> owner accepts — passes
    ``rental_request_id`` and may omit the amount, which is then taken from
    the request itself so a client cannot underpay.
    """

    booking_id: Optional[int] = None
    rental_request_id: Optional[int] = None
    amount: Optional[float] = Field(None, gt=0)
    payment_type: PaymentType
    transaction_id: Optional[str] = None

    @model_validator(mode="after")
    def _exactly_one_target(self) -> "PaymentCreate":
        if (self.booking_id is None) == (self.rental_request_id is None):
            raise ValueError(
                "exactly one of booking_id or rental_request_id is required"
            )
        if self.booking_id is not None and self.amount is None:
            raise ValueError("amount is required when paying for a booking")
        return self


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: Optional[int] = None
    rental_request_id: Optional[int] = None
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


class PaymentPayDc(BaseModel):
    """What opening a DC checkout hands back: the link to follow and the
    reference it carries, plus the still-PENDING payment it belongs to."""

    url: str
    reference: str
    payment: PaymentResponse


class PaymentConfirm(BaseModel):
    transaction_id: str = Field(..., min_length=1)

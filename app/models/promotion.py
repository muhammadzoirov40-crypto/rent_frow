"""Paid TOP promotion: what the admin sells and what a purchase records.

Two tables, no money columns that the browser can touch:

* ``TopPlan``      - duration + price + on/off, edited only by an admin.
                     The four durations the product defines (3h / 1d / 1w /
                     1m) are seeded inactive at price 0: this project had no
                     price list anywhere, and inventing one would be a business
                     decision the code has no right to make. An admin sets the
                     price and flips the plan on.

* ``TopPromotion`` - one row per request/purchase. The price, plan name and
                     duration are copied in at creation time, so editing the
                     plan afterwards never rewrites what somebody paid, and
                     the history stays answerable forever (spec: preserve
                     promotion history).

A partial unique index allows at most one PENDING/ACTIVE row per listing -
that is the database-level guarantee that a double-clicked "Make TOP" cannot
create two charges. Everything else in the row is server-computed: the client
posts ``listing_id`` + ``plan_id`` and nothing else.
"""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import TopPromotionPayment, TopPromotionStatus

# The durations the product defines. Admin-created plans must pick one of
# these; the service refuses anything else.
TOP_DURATION_KEYS = ("3h", "1d", "1w", "1m")


class TopPlan(Base):
    __tablename__ = "top_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # one of TOP_DURATION_KEYS - validated in the service, not trusted from
    # the request body before then.
    duration_key: Mapped[str] = mapped_column(String(8), nullable=False)
    # Server-side price, TJS. 0 with is_active=False is the seeded state:
    # the admin must configure a real price before users can buy anything.
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        Index("idx_top_plans_active", "is_active"),
    )


class TopPromotion(Base):
    __tablename__ = "top_promotions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    listing_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("listings.id"), nullable=False, index=True
    )
    # the owner at request time - survives the listing being handed around
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    plan_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("top_plans.id"), nullable=False, index=True
    )
    # denormalised on purpose: editing the plan must never rewrite what was
    # actually bought (history preservation).
    plan_name: Mapped[str] = mapped_column(String(100), nullable=False)
    duration_key: Mapped[str] = mapped_column(String(8), nullable=False)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)

    # PENDING -> ACTIVE -> EXPIRED, or PENDING -> REJECTED, or
    # ACTIVE -> CANCELLED (manual deactivation).
    status: Mapped[TopPromotionStatus] = mapped_column(
        SAEnum(TopPromotionStatus), nullable=False, default=TopPromotionStatus.PENDING,
        index=True,
    )
    # UNPAID -> PAID (wallet charge) or UNPAID -> APPROVED (admin authorisation).
    payment_status: Mapped[TopPromotionPayment] = mapped_column(
        SAEnum(TopPromotionPayment), nullable=False, default=TopPromotionPayment.UNPAID,
    )

    # naive UTC - the convention the whole backend uses (datetime.utcnow()).
    # The window always runs from the actual activation moment, never from
    # the request moment, so an approval next week buys a full window.
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)

    reject_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    plan = relationship("TopPlan", lazy="selectin")
    listing = relationship("Listing", lazy="selectin")
    user = relationship("User", lazy="selectin")

    __table_args__ = (
        Index("idx_top_promo_status_expires", "status", "expires_at"),
        Index("idx_top_promo_user_created", "user_id", "created_at"),
        # At most one open (PENDING or ACTIVE) promotion per listing. This is
        # what makes a repeated "Make TOP" click return 409 instead of
        # charging twice - the guarantee lives in the database, not in a
        # check that a race can slip between.
        Index(
            "uq_top_promo_open_listing",
            "listing_id",
            unique=True,
            sqlite_where=text("status IN ('PENDING', 'ACTIVE')"),
            postgresql_where=text("status IN ('PENDING', 'ACTIVE')"),
        ),
    )

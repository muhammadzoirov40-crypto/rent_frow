"""The renter's money: one wallet per user, plus an append-only ledger.

Two numbers only:

* ``balance`` - what the user may spend right now (Available)
* ``held``    - what is reserved by rental requests that are still open or
                accepted (Reserved / Held)

``balance + held`` is what the user actually owns. Every change goes through a
``WalletTransaction`` row, so the history can always be re-checked against the
running totals, and the backend - never the browser - decides whether an amount
is affordable.
"""

from datetime import datetime
from sqlalchemy import Integer, String, DateTime, Numeric, ForeignKey, Index, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.core.enums import WalletTransactionType


class Wallet(Base):
    __tablename__ = "wallets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True
    )
    # spendable right now
    balance: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    # reserved by open / accepted rental requests
    held: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="TJS")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        Index("idx_wallet_user", "user_id"),
    )


class WalletTransaction(Base):
    """One immutable ledger row. ``amount`` is the signed change to the
    available balance, ``held_amount`` the signed change to the reserved one -
    so a hold shows up as ``amount = -X, held_amount = +X`` and nets to zero
    across the wallet."""

    __tablename__ = "wallet_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    wallet_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("wallets.id"), nullable=False, index=True
    )
    # denormalised on purpose: "whose money is this" must stay answerable
    # without joining, even if the wallet row is ever moved.
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    held_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    type: Mapped[WalletTransactionType] = mapped_column(
        SAEnum(WalletTransactionType), nullable=False
    )
    rental_request_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("rental_requests.id"), nullable=True, index=True
    )
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # running totals after this row - makes the history self-explanatory
    balance_after: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    held_after: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        Index("idx_wallet_tx_user_created", "user_id", "created_at"),
        Index("idx_wallet_tx_request", "rental_request_id", "type"),
    )


class TopupIntent(Base):
    """A top-up waiting for DC Wallet to confirm it.

    Opening the payment link creates one row here carrying a ``reference``
    that travels in the link's ``f3`` and comes back with the webhook. Until
    that webhook arrives no money exists: this table is the waiting room, the
    ledger stays the single source of truth, and the same reference can only
    ever be settled once.
    """

    __tablename__ = "topup_intents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    # what we put in f3 and what the callback must echo back
    reference: Mapped[str] = mapped_column(
        String(40), nullable=False, unique=True, index=True
    )
    # PENDING -> PAID (money in the ledger) | FAILED (declined)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="PENDING", index=True
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False, default="paydc")
    # set when this waiting row settles a TOP promotion instead of topping up
    # the wallet: same reference, same webhook, different destination for the
    # money. NULL = a plain balance top-up (the original meaning).
    promotion_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("top_promotions.id"), nullable=True, index=True
    )
    # ...and this one when it settles a rental payment (the rent or the
    # deposit) instead: the checkout link carries the reference, the callback
    # hands the money to that exact payment. NULL with promotion_id NULL =
    # still a plain balance top-up.
    payment_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("payments.id"), nullable=True, index=True
    )
    # whatever the callback sent, kept verbatim for the audit trail
    raw_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_topup_user_created", "user_id", "created_at"),
    )

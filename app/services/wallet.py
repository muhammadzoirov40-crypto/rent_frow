"""The wallet: available vs reserved, and the ledger behind both.

The browser never decides whether money is there - every check and every
arithmetic step happens here, on the same transaction as the rest of the flow,
so a rental request and the hold that pays for it either both land or neither
does.

Lifecycle of one rental request's money:

    create    HELD      available -> reserved
    reject    RELEASED  reserved -> available   (rent never taken)
              REFUNDED  reserved -> available   (rent was already PAID)
    cancel    RELEASED / REFUNDED  (same two cases)
    complete  COMPLETED reserved leaves the wallet for good

Every call is idempotent: it asks how much of that request is still reserved
first, so a retry can never double-hold or double-release.
"""

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.enums import WalletTransactionType, PaymentStatus
from app.models.wallet import Wallet, WalletTransaction
from app.models.payment import Payment
from app.repositories.wallet import WalletRepository

# Amounts are money, so everything is rounded to the subunit before it is
# stored or compared - floating point drift must not decide affordability.
CURRENCY = "TJS"


def money(value) -> float:
    return round(float(value or 0), 2)


class WalletService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = WalletRepository(db)

    # ---------------------------------------------------------------- reading
    async def get_or_create(self, user_id: int) -> Wallet:
        wallet = await self.repo.get_by_user(user_id)
        if wallet:
            return wallet
        # A wallet is created the first time its owner touches anything that
        # needs money, seeded with the configured demo balance.
        return await self.repo.create(
            user_id=user_id,
            balance=money(get_settings().WALLET_STARTING_BALANCE),
            held=0.0,
            currency=CURRENCY,
        )

    async def summary(self, user_id: int) -> dict:
        wallet = await self.get_or_create(user_id)
        available = money(wallet.balance)
        held = money(wallet.held)
        return {
            "user_id": user_id,
            "balance": available,
            "held": held,
            "total": money(available + held),
            "currency": wallet.currency or CURRENCY,
        }

    async def can_afford(self, user_id: int, amount: float) -> bool:
        wallet = await self.get_or_create(user_id)
        return money(wallet.balance) >= money(amount)

    async def transactions(
        self, user_id: int, skip: int = 0, limit: int = 50
    ) -> tuple[list[WalletTransaction], int]:
        await self.get_or_create(user_id)
        return await self.repo.list_transactions(user_id, skip, limit)

    # ---------------------------------------------------------------- writing
    async def _record(
        self,
        wallet: Wallet,
        *,
        tx_type: WalletTransactionType,
        amount: float,
        held_amount: float,
        rental_request_id: int | None = None,
        description: str | None = None,
    ) -> WalletTransaction:
        return await self.repo.add_transaction(
            wallet_id=wallet.id,
            user_id=wallet.user_id,
            amount=money(amount),
            held_amount=money(held_amount),
            type=tx_type,
            rental_request_id=rental_request_id,
            description=description,
            balance_after=money(wallet.balance),
            held_after=money(wallet.held),
        )

    async def topup(self, user_id: int, amount: float, description: str | None = None) -> WalletTransaction:
        """Money in. There is no payment gateway on the free tier, so a top-up
        is an explicit manual credit - swap this one method for a provider and
        nothing else in the flow has to change."""
        amount = money(amount)
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than zero")
        if amount > 1_000_000:
            raise HTTPException(status_code=400, detail="Amount is too large")
        wallet = await self.get_or_create(user_id)
        wallet.balance = money(wallet.balance) + amount
        await self.db.flush()
        return await self._record(
            wallet,
            tx_type=WalletTransactionType.TOPUP,
            amount=amount,
            held_amount=0.0,
            description=description or "Balance top-up",
        )

    async def hold(
        self,
        user_id: int,
        amount: float,
        rental_request_id: int | None = None,
        description: str | None = None,
    ) -> WalletTransaction | None:
        """Reserve ``amount`` for a rental request (available -> reserved).

        Raises INSUFFICIENT_BALANCE when the renter cannot cover it, and does
        nothing (returns None) when this request is already held.
        """
        amount = money(amount)
        if amount <= 0:
            return None
        if await self.repo.net_held_for_request(rental_request_id) > 0:
            return None
        wallet = await self.get_or_create(user_id)
        if money(wallet.balance) < amount:
            raise HTTPException(status_code=400, detail="INSUFFICIENT_BALANCE")
        wallet.balance = money(wallet.balance) - amount
        wallet.held = money(wallet.held) + amount
        await self.db.flush()
        return await self._record(
            wallet,
            tx_type=WalletTransactionType.HELD,
            amount=-amount,
            held_amount=amount,
            rental_request_id=rental_request_id,
            description=description or "Rental request hold",
        )

    async def release(
        self,
        user_id: int,
        amount: float,
        rental_request_id: int | None = None,
        *,
        kind: WalletTransactionType = WalletTransactionType.RELEASED,
        description: str | None = None,
    ) -> WalletTransaction | None:
        """Reserved -> available. Never releases more than is actually held."""
        available = await self.repo.net_held_for_request(rental_request_id)
        if available <= 0:
            return None
        amount = money(min(money(amount), available))
        if amount <= 0:
            return None
        wallet = await self.get_or_create(user_id)
        wallet.held = money(wallet.held) - amount
        wallet.balance = money(wallet.balance) + amount
        await self.db.flush()
        return await self._record(
            wallet,
            tx_type=kind,
            amount=amount,
            held_amount=-amount,
            rental_request_id=rental_request_id,
            description=description,
        )

    async def settle(
        self,
        user_id: int,
        amount: float,
        rental_request_id: int | None = None,
        description: str | None = None,
    ) -> WalletTransaction | None:
        """The reserved rent is consumed - it leaves the wallet for good."""
        available = await self.repo.net_held_for_request(rental_request_id)
        if available <= 0:
            return None
        amount = money(min(money(amount), available))
        if amount <= 0:
            return None
        wallet = await self.get_or_create(user_id)
        wallet.held = money(wallet.held) - amount
        await self.db.flush()
        return await self._record(
            wallet,
            tx_type=WalletTransactionType.COMPLETED,
            amount=0.0,
            held_amount=-amount,
            rental_request_id=rental_request_id,
            description=description or "Rental completed",
        )

    async def end_request_hold(
        self,
        user_id: int,
        amount: float,
        rental_request_id: int | None = None,
        *,
        completed: bool = False,
        description: str | None = None,
    ) -> WalletTransaction | None:
        """The one hook a rental request calls when it stops being active.

        Completing settles the hold; rejecting or cancelling gives it back -
        as REFUNDED when the rent had already been collected (a PAID payment
        exists against this request), otherwise as a plain RELEASED hold.
        """
        if completed:
            return await self.settle(user_id, amount, rental_request_id, description)
        kind = (
            WalletTransactionType.REFUNDED
            if await self._rent_already_collected(rental_request_id)
            else WalletTransactionType.RELEASED
        )
        return await self.release(
            user_id, amount, rental_request_id, kind=kind, description=description
        )

    async def _rent_already_collected(self, rental_request_id: int | None) -> bool:
        """True once the owner has confirmed real money for this request -
        which is what turns a release into a refund."""
        if not rental_request_id:
            return False
        result = await self.db.execute(
            select(func.count())
            .select_from(Payment)
            .where(
                Payment.rental_request_id == rental_request_id,
                Payment.status == PaymentStatus.PAID,
            )
        )
        return int(result.scalar() or 0) > 0

    async def held_for_request(self, rental_request_id: int | None) -> float:
        return money(await self.repo.net_held_for_request(rental_request_id))

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

from decimal import Decimal, ROUND_HALF_UP
import asyncio
import inspect

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
CENT = Decimal("0.01")
# How many times a writer re-reads and decides again when somebody else moved
# the wallet first. The in-process lock makes this rare; four rounds makes it
# impossible to exhaust in practice, and running out raises 409 instead of
# writing a stale number.
CAS_RETRIES = 4


def money_d(value) -> Decimal:
    """Money as an exact decimal.

    ``round(0.1 + 0.2, 2)`` still hides 0.30000000000000004 behind a display
    rounding, and repeated float additions drift further with every transfer.
    Arithmetic in Decimal cannot drift, so the subtraction that decides whether
    someone can afford a rental is exact.
    """
    return Decimal(str(value or 0)).quantize(CENT, rounding=ROUND_HALF_UP)


def money(value) -> float:
    """The wire format: JSON and the Pydantic schemas still speak float."""
    return float(money_d(value))


# One lock per wallet, so read-check-write cannot interleave inside this
# process. SQLite (what the server runs) has no row locks, so this - not the
# database - is what serialises two rental requests racing for the same
# balance; on PostgreSQL the row lock in the repository is the second line.
_wallet_locks: dict[int, asyncio.Lock] = {}


def _wallet_lock(user_id: int) -> asyncio.Lock:
    lock = _wallet_locks.get(user_id)
    if lock is None:
        lock = _wallet_locks[user_id] = asyncio.Lock()
    return lock


class WalletService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = WalletRepository(db)

    # ---------------------------------------------------------------- reading
    async def get_or_create(
        self, user_id: int, *, for_update: bool = False
    ) -> Wallet:
        finder = (
            self.repo.get_by_user_for_update if for_update else self.repo.get_by_user
        )
        wallet = await finder(user_id)
        if wallet:
            return wallet
        # A wallet is created the first time its owner touches anything that
        # needs money, seeded with the configured demo balance.
        return await self.repo.create(
            user_id=user_id,
            balance=money_d(get_settings().WALLET_STARTING_BALANCE),
            held=Decimal("0.00"),
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
        # With the balance switched off nothing is ever short.
        if not get_settings().WALLET_ENABLED:
            return True
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

    async def _cas_apply(self, user_id: int, build):
        """Read the wallet, let ``build`` decide the new numbers, swap them in.

        ``build(wallet)`` returns ``(new_balance, new_held, effective_amount)``
        or ``None`` for "nothing to do" (this request is already held, nothing
        is reserved). It may raise its own refusal - INSUFFICIENT_BALANCE - and
        that is an answer, not a race.

        The swap only lands while the wallet still reads the pair the decision
        was based on. If another writer got there first we read the new numbers
        and decide again instead of overwriting theirs, which is precisely the
        check-then-act that let two simultaneous requests spend one balance.
        """
        for _ in range(CAS_RETRIES):
            wallet = await self.get_or_create(user_id, for_update=True)
            decision = build(wallet)
            if inspect.isawaitable(decision):
                decision = await decision
            if decision is None:
                return None, None
            new_balance, new_held, effective = decision
            applied = await self.repo.cas_wallet(
                user_id,
                money_d(wallet.balance),
                money_d(wallet.held),
                new_balance,
                new_held,
            )
            if applied:
                # The database did the arithmetic we are about to report, so
                # read it back rather than trusting the copy we walked in with.
                await self.db.refresh(wallet)
                await self.db.flush()
                return wallet, effective
        raise HTTPException(status_code=409, detail="WALLET_BUSY")

    async def topup(self, user_id: int, amount: float, description: str | None = None) -> WalletTransaction:
        """Money in. There is no payment gateway on the free tier, so a top-up
        is an explicit manual credit - swap this one method for a provider and
        nothing else in the flow has to change."""
        amount = money_d(amount)
        if not get_settings().WALLET_ENABLED:
            raise HTTPException(status_code=403, detail="WALLET_DISABLED")
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than zero")
        if amount > 1_000_000:
            raise HTTPException(status_code=400, detail="Amount is too large")
        async with _wallet_lock(user_id):
            wallet, _ = await self._cas_apply(
                user_id,
                lambda w: (money_d(w.balance) + amount, money_d(w.held), amount),
            )
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
        # No balance, no reservation: the request just goes through.
        if not get_settings().WALLET_ENABLED:
            return None
        amount = money_d(amount)
        if amount <= 0:
            return None

        async def decide(wallet):
            # Re-checked on every attempt: a retry must not double-hold.
            if await self.repo.net_held_for_request(rental_request_id) > 0:
                return None
            balance, held = money_d(wallet.balance), money_d(wallet.held)
            if balance < amount:
                raise HTTPException(status_code=400, detail="INSUFFICIENT_BALANCE")
            return balance - amount, held + amount, amount

        async with _wallet_lock(user_id):
            wallet, effective = await self._cas_apply(user_id, decide)
            if wallet is None:
                return None
            return await self._record(
                wallet,
                tx_type=WalletTransactionType.HELD,
                amount=-float(effective),
                held_amount=float(effective),
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

        async def decide(wallet):
            available = money_d(await self.repo.net_held_for_request(rental_request_id))
            if available <= 0:
                return None
            take = min(money_d(amount), available)
            if take <= 0:
                return None
            balance, held = money_d(wallet.balance), money_d(wallet.held)
            return balance + take, held - take, take

        async with _wallet_lock(user_id):
            wallet, effective = await self._cas_apply(user_id, decide)
            if wallet is None:
                return None
            return await self._record(
                wallet,
                tx_type=kind,
                amount=float(effective),
                held_amount=-float(effective),
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

        async def decide(wallet):
            available = money_d(await self.repo.net_held_for_request(rental_request_id))
            if available <= 0:
                return None
            take = min(money_d(amount), available)
            if take <= 0:
                return None
            balance, held = money_d(wallet.balance), money_d(wallet.held)
            return balance, held - take, take

        async with _wallet_lock(user_id):
            wallet, effective = await self._cas_apply(user_id, decide)
            if wallet is None:
                return None
            return await self._record(
                wallet,
                tx_type=WalletTransactionType.COMPLETED,
                amount=0.0,
                held_amount=-float(effective),
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

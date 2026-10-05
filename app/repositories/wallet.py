from typing import Optional
from datetime import datetime
from sqlalchemy import select, func, desc, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.wallet import Wallet, WalletTransaction
from app.repositories.base import BaseRepository


class WalletRepository(BaseRepository[Wallet]):
    def __init__(self, db: AsyncSession):
        super().__init__(Wallet, db)

    async def get_by_user(self, user_id: int) -> Optional[Wallet]:
        result = await self.db.execute(
            select(Wallet).where(Wallet.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user_for_update(self, user_id: int) -> Optional[Wallet]:
        """The row this transaction is about to change.

        ``FOR UPDATE`` holds the row until commit, so a second transaction that
        wants the same balance blocks instead of reading the value the first one
        is about to overwrite - that is what stops two simultaneous rental
        requests from spending the same somoni twice. SQLite has no row locks
        (it locks the whole database file), so its dialect omits the clause and
        the caller serialises with an in-process lock instead; PostgreSQL gets
        the real lock here.
        """
        result = await self.db.execute(
            select(Wallet).where(Wallet.user_id == user_id).with_for_update()
        )
        return result.scalar_one_or_none()

    async def cas_wallet(
        self,
        user_id: int,
        old_balance,
        old_held,
        new_balance,
        new_held,
    ) -> bool:
        """Compare-and-swap: change the wallet only if it still reads what we read.

        The guard travels inside the UPDATE itself, so the check and the write
        are one statement the database applies atomically. A second caller that
        read the same balance matches zero rows and has to look again, instead
        of writing the value it based its decision on - which is exactly how two
        simultaneous requests used to spend the same money twice.

        This is what carries SQLite, where ``FOR UPDATE`` is a no-op; on
        PostgreSQL the row lock already serialises the pair and this simply
        never misses. The columns are NUMERIC(12, 2) and both sides of the
        comparison come from the same quantised Decimal, so the guard compares
        money exactly instead of two floats that only look equal.
        """
        result = await self.db.execute(
            update(Wallet)
            .where(
                Wallet.user_id == user_id,
                Wallet.balance == old_balance,
                Wallet.held == old_held,
            )
            .values(balance=new_balance, held=new_held)
            .execution_options(synchronize_session=False)
        )
        return int(result.rowcount or 0) == 1

    async def add_transaction(self, **kwargs) -> WalletTransaction:
        tx = WalletTransaction(**kwargs)
        self.db.add(tx)
        await self.db.flush()
        await self.db.refresh(tx)
        return tx

    async def net_held_for_request(self, rental_request_id: int | None) -> float:
        """How much of this request is still reserved right now.

        HELD adds to it, RELEASED / REFUNDED / COMPLETED take it away — so the
        sum of ``held_amount`` is the live hold, and asking it again makes every
        hold/release/complete call idempotent.
        """
        if not rental_request_id:
            return 0.0
        result = await self.db.execute(
            select(func.coalesce(func.sum(WalletTransaction.held_amount), 0.0)).where(
                WalletTransaction.rental_request_id == rental_request_id
            )
        )
        return float(result.scalar() or 0.0)

    async def list_transactions(
        self, user_id: int, skip: int = 0, limit: int = 50
    ) -> tuple[list[WalletTransaction], int]:
        result = await self.db.execute(
            select(WalletTransaction)
            .where(WalletTransaction.user_id == user_id)
            .order_by(desc(WalletTransaction.created_at), desc(WalletTransaction.id))
            .offset(skip)
            .limit(limit)
        )
        items = list(result.scalars().all())
        total_result = await self.db.execute(
            select(func.count())
            .select_from(WalletTransaction)
            .where(WalletTransaction.user_id == user_id)
        )
        return items, int(total_result.scalar() or 0)

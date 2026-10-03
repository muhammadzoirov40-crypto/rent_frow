from typing import Optional
from datetime import datetime
from sqlalchemy import select, func, desc
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

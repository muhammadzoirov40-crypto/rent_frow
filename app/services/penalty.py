from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.penalty import PenaltyRepository
from app.repositories.rental import RentalRepository
from app.repositories.audit_log import AuditLogRepository
from app.models.penalty import Penalty
from app.core.enums import PenaltyStatus


class PenaltyService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.penalty_repo = PenaltyRepository(db)
        self.rental_repo = RentalRepository(db)
        self.audit_repo = AuditLogRepository(db)

    async def create(
        self, admin_id: int, rental_id: int, customer_id: int, reason: str, amount: float
    ) -> Penalty:
        rental = await self.rental_repo.get_by_id(rental_id)
        if not rental:
            raise HTTPException(status_code=404, detail="Rental not found")

        penalty = await self.penalty_repo.create(
            rental_id=rental_id,
            customer_id=customer_id,
            reason=reason,
            amount=amount,
            status=PenaltyStatus.PENDING,
        )

        await self.audit_repo.create(
            user_id=admin_id,
            action="penalty_created",
            entity_type="penalty",
            entity_id=penalty.id,
            new_data={
                "rental_id": rental_id,
                "reason": reason,
                "amount": amount,
            },
        )

        return penalty

    async def get_by_id(self, penalty_id: int) -> Penalty:
        penalty = await self.penalty_repo.get_by_id(penalty_id)
        if not penalty:
            raise HTTPException(status_code=404, detail="Penalty not found")
        return penalty

    async def get_customer_penalties(
        self, customer_id: int, status: PenaltyStatus | None = None
    ) -> list[Penalty]:
        return await self.penalty_repo.get_customer_penalties(customer_id, status)

    async def pay_penalty(self, admin_id: int, penalty_id: int) -> Penalty:
        penalty = await self.get_by_id(penalty_id)
        if penalty.status != PenaltyStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot pay penalty in {penalty.status.value} status",
            )

        old_status = penalty.status.value
        penalty = await self.penalty_repo.update(penalty, status=PenaltyStatus.PAID)

        await self.audit_repo.create(
            user_id=admin_id,
            action="penalty_paid",
            entity_type="penalty",
            entity_id=penalty.id,
            old_data={"status": old_status},
            new_data={"status": PenaltyStatus.PAID.value},
        )

        return penalty

    async def waive_penalty(self, admin_id: int, penalty_id: int) -> Penalty:
        penalty = await self.get_by_id(penalty_id)
        if penalty.status != PenaltyStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot waive penalty in {penalty.status.value} status",
            )

        old_status = penalty.status.value
        penalty = await self.penalty_repo.update(penalty, status=PenaltyStatus.WAIVED)

        await self.audit_repo.create(
            user_id=admin_id,
            action="penalty_waived",
            entity_type="penalty",
            entity_id=penalty.id,
            old_data={"status": old_status},
            new_data={"status": PenaltyStatus.WAIVED.value},
        )

        return penalty

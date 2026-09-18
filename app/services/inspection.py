from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.inspection import InspectionRepository
from app.repositories.rental import RentalRepository
from app.repositories.equipment import EquipmentRepository
from app.repositories.penalty import PenaltyRepository
from app.repositories.audit_log import AuditLogRepository
from app.schemas.inspection import InspectionCreate
from app.models.inspection import Inspection
from app.core.enums import RentalStatus, EquipmentCondition, PenaltyStatus


class InspectionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.inspection_repo = InspectionRepository(db)
        self.rental_repo = RentalRepository(db)
        self.equipment_repo = EquipmentRepository(db)
        self.penalty_repo = PenaltyRepository(db)
        self.audit_repo = AuditLogRepository(db)

    async def create(self, inspector_id: int, data: InspectionCreate) -> Inspection:
        rental = await self.rental_repo.get_by_id(data.rental_id)
        if not rental:
            raise HTTPException(status_code=404, detail="Rental not found")

        if rental.status != RentalStatus.RETURNED and rental.status != RentalStatus.INSPECTING:
            raise HTTPException(
                status_code=400,
                detail="Inspection can only be created for returned or inspecting rentals",
            )

        existing = await self.inspection_repo.get_by_rental_id(data.rental_id)
        if existing:
            raise HTTPException(status_code=409, detail="Inspection already exists for this rental")

        equipment = await self.equipment_repo.get_by_id(rental.equipment_id)
        if not data.condition_before and equipment:
            data.condition_before = equipment.condition.value

        inspection = await self.inspection_repo.create(
            rental_id=data.rental_id,
            equipment_id=rental.equipment_id,
            inspector_id=inspector_id,
            condition_before=data.condition_before,
            condition_after=data.condition_after,
            damage_found=data.damage_found,
            damage_description=data.damage_description,
            damage_cost=data.damage_cost,
            notes=data.notes,
        )

        if data.damage_found and data.damage_cost > 0:
            penalty_reason = data.damage_description or f"Damage found during inspection (rental #{data.rental_id})"
            await self.penalty_repo.create(
                rental_id=data.rental_id,
                customer_id=rental.customer_id,
                reason=penalty_reason,
                amount=data.damage_cost,
                status=PenaltyStatus.PENDING,
            )

        if equipment and data.condition_after:
            condition_map = {
                "NEW": EquipmentCondition.NEW,
                "GOOD": EquipmentCondition.GOOD,
                "FAIR": EquipmentCondition.FAIR,
                "POOR": EquipmentCondition.POOR,
            }
            new_condition = condition_map.get(data.condition_after, equipment.condition)
            await self.equipment_repo.update(equipment, condition=new_condition)

        await self.audit_repo.create(
            user_id=inspector_id,
            action="inspection_completed",
            entity_type="inspection",
            entity_id=inspection.id,
            new_data={
                "rental_id": data.rental_id,
                "damage_found": data.damage_found,
                "damage_cost": data.damage_cost,
            },
        )

        return inspection

    async def get_by_id(self, inspection_id: int) -> Inspection:
        inspection = await self.inspection_repo.get_by_id(inspection_id)
        if not inspection:
            raise HTTPException(status_code=404, detail="Inspection not found")
        return inspection

    async def get_by_rental_id(self, rental_id: int) -> Inspection | None:
        return await self.inspection_repo.get_by_rental_id(rental_id)

    async def get_by_equipment_id(self, equipment_id: int) -> list[Inspection]:
        return await self.inspection_repo.get_by_equipment_id(equipment_id)

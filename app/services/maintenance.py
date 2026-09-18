from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.maintenance import MaintenanceRepository
from app.repositories.equipment import EquipmentRepository
from app.repositories.audit_log import AuditLogRepository
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate
from app.models.maintenance import Maintenance
from app.core.enums import MaintenanceStatus, EquipmentStatus


class MaintenanceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.maintenance_repo = MaintenanceRepository(db)
        self.equipment_repo = EquipmentRepository(db)
        self.audit_repo = AuditLogRepository(db)

    async def create(self, admin_id: int, data: MaintenanceCreate) -> Maintenance:
        equipment = await self.equipment_repo.get_by_id(data.equipment_id)
        if not equipment:
            raise HTTPException(status_code=404, detail="Equipment not found")

        active = await self.maintenance_repo.get_active_for_equipment(data.equipment_id)
        if active:
            raise HTTPException(
                status_code=409,
                detail="Equipment already has an active maintenance record",
            )

        maintenance = await self.maintenance_repo.create(
            equipment_id=data.equipment_id,
            reason=data.reason,
            description=data.description,
            cost=data.cost,
            status=MaintenanceStatus.PENDING,
        )

        await self.equipment_repo.update(equipment, status=EquipmentStatus.MAINTENANCE)

        await self.audit_repo.create(
            user_id=admin_id,
            action="maintenance_created",
            entity_type="maintenance",
            entity_id=maintenance.id,
            new_data={
                "equipment_id": data.equipment_id,
                "reason": data.reason,
            },
        )

        return maintenance

    async def get_by_id(self, maintenance_id: int) -> Maintenance:
        maintenance = await self.maintenance_repo.get_by_id(maintenance_id)
        if not maintenance:
            raise HTTPException(status_code=404, detail="Maintenance not found")
        return maintenance

    async def get_all(
        self, status: MaintenanceStatus | None = None, skip: int = 0, limit: int = 20
    ) -> list[Maintenance]:
        return await self.maintenance_repo.get_all_maintenance(status, skip, limit)

    async def start_maintenance(self, admin_id: int, maintenance_id: int) -> Maintenance:
        maintenance = await self.get_by_id(maintenance_id)
        if maintenance.status != MaintenanceStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot start maintenance in {maintenance.status.value} status",
            )

        old_status = maintenance.status.value
        maintenance = await self.maintenance_repo.update(
            maintenance,
            status=MaintenanceStatus.IN_PROGRESS,
            started_at=datetime.utcnow(),
        )

        await self.audit_repo.create(
            user_id=admin_id,
            action="maintenance_started",
            entity_type="maintenance",
            entity_id=maintenance.id,
            old_data={"status": old_status},
            new_data={"status": MaintenanceStatus.IN_PROGRESS.value},
        )

        return maintenance

    async def complete_maintenance(self, admin_id: int, maintenance_id: int) -> Maintenance:
        maintenance = await self.get_by_id(maintenance_id)
        if maintenance.status != MaintenanceStatus.IN_PROGRESS:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot complete maintenance in {maintenance.status.value} status",
            )

        old_status = maintenance.status.value
        maintenance = await self.maintenance_repo.update(
            maintenance,
            status=MaintenanceStatus.COMPLETED,
            completed_at=datetime.utcnow(),
        )

        equipment = await self.equipment_repo.get_by_id(maintenance.equipment_id)
        if equipment:
            await self.equipment_repo.update(equipment, status=EquipmentStatus.AVAILABLE)

        await self.audit_repo.create(
            user_id=admin_id,
            action="maintenance_completed",
            entity_type="maintenance",
            entity_id=maintenance.id,
            old_data={"status": old_status},
            new_data={"status": MaintenanceStatus.COMPLETED.value},
        )

        return maintenance

    async def update(self, admin_id: int, maintenance_id: int, data: MaintenanceUpdate) -> Maintenance:
        maintenance = await self.get_by_id(maintenance_id)
        update_data = data.model_dump(exclude_unset=True)

        old_data = {k: str(getattr(maintenance, k)) for k in update_data.keys()}

        maintenance = await self.maintenance_repo.update(maintenance, **update_data)

        await self.audit_repo.create(
            user_id=admin_id,
            action="maintenance_updated",
            entity_type="maintenance",
            entity_id=maintenance.id,
            old_data=old_data,
            new_data={k: str(v) for k, v in update_data.items()},
        )

        return maintenance

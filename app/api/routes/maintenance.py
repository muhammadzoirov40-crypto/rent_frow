from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_admin, CurrentUser
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate, MaintenanceResponse
from app.schemas.base import APIResponse
from app.services.maintenance import MaintenanceService
from app.core.enums import MaintenanceStatus

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


@router.post("", response_model=APIResponse[MaintenanceResponse])
async def create_maintenance(
    data: MaintenanceCreate,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = MaintenanceService(db)
    maintenance = await service.create(current_user.user_id, data)
    return APIResponse(message="Maintenance created successfully", data=maintenance)


@router.get("", response_model=APIResponse[list[MaintenanceResponse]])
async def list_maintenance(
    status: MaintenanceStatus | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = MaintenanceService(db)
    items = await service.get_all(status, skip, limit)
    return APIResponse(data=items)


@router.get("/{maintenance_id}", response_model=APIResponse[MaintenanceResponse])
async def get_maintenance(
    maintenance_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = MaintenanceService(db)
    maintenance = await service.get_by_id(maintenance_id)
    return APIResponse(data=maintenance)


@router.put("/{maintenance_id}", response_model=APIResponse[MaintenanceResponse])
async def update_maintenance(
    maintenance_id: int,
    data: MaintenanceUpdate,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = MaintenanceService(db)
    maintenance = await service.update(current_user.user_id, maintenance_id, data)
    return APIResponse(message="Maintenance updated", data=maintenance)


@router.post("/{maintenance_id}/start", response_model=APIResponse[MaintenanceResponse])
async def start_maintenance(
    maintenance_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = MaintenanceService(db)
    maintenance = await service.start_maintenance(current_user.user_id, maintenance_id)
    return APIResponse(message="Maintenance started", data=maintenance)


@router.post("/{maintenance_id}/complete", response_model=APIResponse[MaintenanceResponse])
async def complete_maintenance(
    maintenance_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = MaintenanceService(db)
    maintenance = await service.complete_maintenance(current_user.user_id, maintenance_id)
    return APIResponse(message="Maintenance completed", data=maintenance)

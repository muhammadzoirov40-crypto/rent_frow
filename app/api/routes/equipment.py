from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_admin, require_customer, get_current_user, CurrentUser
from app.core.enums import EquipmentStatus
from app.schemas.equipment import (
    EquipmentCreate, EquipmentUpdate, EquipmentResponse,
    AvailabilityCheck, AvailabilityResponse,
)
from app.schemas.base import APIResponse, PaginatedResponse
from app.services.equipment import EquipmentService

router = APIRouter(prefix="/equipment", tags=["Equipment"])


@router.post("", response_model=APIResponse[EquipmentResponse])
async def create_equipment(
    data: EquipmentCreate,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = EquipmentService(db)
    equipment = await service.create(data)
    return APIResponse(message="Equipment created successfully", data=equipment)


@router.get("", response_model=PaginatedResponse[EquipmentResponse])
async def list_equipment(
    query: str | None = Query(None),
    category_id: int | None = Query(None),
    status: EquipmentStatus | None = Query(None),
    is_active: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EquipmentService(db)
    items, total = await service.search(query, category_id, status, is_active, skip, limit)
    return PaginatedResponse(
        data=items,
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.post("/availability", response_model=APIResponse[AvailabilityResponse])
async def check_availability(
    data: AvailabilityCheck,
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = EquipmentService(db)
    result = await service.check_availability(data)
    return APIResponse(data=result)


@router.get("/available/dates", response_model=APIResponse[list[EquipmentResponse]])
async def get_available_equipment(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    category_id: int | None = Query(None),
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date as date_type
    sd = date_type.fromisoformat(start_date)
    ed = date_type.fromisoformat(end_date)
    service = EquipmentService(db)
    items = await service.get_available_for_dates(sd, ed, category_id)
    return APIResponse(data=items)


@router.get("/{equipment_id}", response_model=APIResponse[EquipmentResponse])
async def get_equipment(
    equipment_id: int,
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = EquipmentService(db)
    equipment = await service.get_by_id(equipment_id)
    return APIResponse(data=equipment)


@router.put("/{equipment_id}", response_model=APIResponse[EquipmentResponse])
async def update_equipment(
    equipment_id: int,
    data: EquipmentUpdate,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = EquipmentService(db)
    equipment = await service.update(equipment_id, data)
    return APIResponse(message="Equipment updated successfully", data=equipment)


@router.delete("/{equipment_id}", response_model=APIResponse)
async def delete_equipment(
    equipment_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = EquipmentService(db)
    await service.delete(equipment_id)
    return APIResponse(message="Equipment deleted successfully")

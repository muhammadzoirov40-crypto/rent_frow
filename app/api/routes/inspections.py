from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_admin, CurrentUser
from app.schemas.inspection import InspectionCreate, InspectionResponse
from app.schemas.base import APIResponse
from app.services.inspection import InspectionService

router = APIRouter(prefix="/inspections", tags=["Inspections"])


@router.post("", response_model=APIResponse[InspectionResponse])
async def create_inspection(
    data: InspectionCreate,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = InspectionService(db)
    inspection = await service.create(current_user.user_id, data)
    return APIResponse(message="Inspection created successfully", data=inspection)


@router.get("/{inspection_id}", response_model=APIResponse[InspectionResponse])
async def get_inspection(
    inspection_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = InspectionService(db)
    inspection = await service.get_by_id(inspection_id)
    return APIResponse(data=inspection)


@router.get("/rental/{rental_id}", response_model=APIResponse[InspectionResponse])
async def get_inspection_by_rental(
    rental_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = InspectionService(db)
    inspection = await service.get_by_rental_id(rental_id)
    return APIResponse(data=inspection)


@router.get("/equipment/{equipment_id}", response_model=APIResponse[list[InspectionResponse]])
async def get_inspections_by_equipment(
    equipment_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = InspectionService(db)
    inspections = await service.get_by_equipment_id(equipment_id)
    return APIResponse(data=inspections)

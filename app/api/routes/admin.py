from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_admin, CurrentUser
from app.core.enums import UserRole
from app.schemas.statistics import StatisticsResponse, AuditLogResponse
from app.schemas.base import APIResponse, PaginatedResponse
from app.services.statistics import StatisticsService
from app.services.audit_log import AuditLogService
from app.schemas.user import UserResponse
from app.repositories.user import UserRepository

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/statistics", response_model=APIResponse[StatisticsResponse])
async def get_statistics(
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = StatisticsService(db)
    stats = await service.get_statistics()
    return APIResponse(data=stats)


@router.get("/audit-logs", response_model=PaginatedResponse[AuditLogResponse])
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AuditLogService(db)
    items = await service.get_all(skip, limit)
    return PaginatedResponse(
        data=items, total=len(items), page=(skip // limit) + 1, page_size=limit
    )


@router.get("/audit-logs/entity/{entity_type}/{entity_id}")
async def get_entity_audit_logs(
    entity_type: str,
    entity_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AuditLogService(db)
    items = await service.get_by_entity(entity_type, entity_id)
    return APIResponse(data=items)


@router.get("/users", response_model=APIResponse[list[UserResponse]])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    users = await repo.get_all(skip, limit)
    return APIResponse(data=users)


class UpdateRoleRequest(BaseModel):
    role: UserRole


@router.patch("/users/{user_id}/role", response_model=APIResponse[UserResponse])
async def update_user_role(
    user_id: int,
    data: UpdateRoleRequest,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user = await repo.update(user, role=data.role)
    return APIResponse(data=UserResponse.model_validate(user))


@router.get("/users/by-email/{email}", response_model=APIResponse[UserResponse])
async def get_user_by_email(
    email: str,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    user = await repo.get_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return APIResponse(data=UserResponse.model_validate(user))

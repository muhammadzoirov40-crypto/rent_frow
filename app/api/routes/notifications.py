from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_auth, CurrentUser
from app.schemas.notification import NotificationResponse
from app.schemas.base import APIResponse, PaginatedResponse
from app.services.notification import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=PaginatedResponse[NotificationResponse])
async def get_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    skip = (page - 1) * page_size
    notifications = await service.get_user_notifications(current_user.user_id, skip, page_size)
    items = [NotificationResponse.model_validate(n) for n in notifications]
    return PaginatedResponse(
        data=items,
        total=len(items),
        page=page,
        page_size=page_size,
    )


@router.get("/unread-count", response_model=APIResponse[dict])
async def get_unread_count(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    count = await service.get_unread_count(current_user.user_id)
    return APIResponse(data={"count": count})


@router.patch("/{notification_id}/read", response_model=APIResponse)
async def mark_notification_read(
    notification_id: int,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    await service.mark_read(notification_id, current_user.user_id)
    return APIResponse(message="Notification marked as read")


@router.patch("/read-all", response_model=APIResponse)
async def mark_all_read(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    await service.mark_all_read(current_user.user_id)
    return APIResponse(message="All notifications marked as read")

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_customer, get_current_user, CurrentUser
from app.schemas.review import ReviewCreate, ReviewUpdate, ReviewResponse
from app.schemas.base import APIResponse, PaginatedResponse
from app.services.review import ReviewService

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.get("", response_model=PaginatedResponse[ReviewResponse])
async def list_reviews(
    equipment_id: int = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReviewService(db)
    items, total = await service.get_by_equipment(equipment_id, skip, limit)
    return PaginatedResponse(
        data=items, total=total, page=(skip // limit) + 1, page_size=limit
    )


@router.post("", response_model=APIResponse[ReviewResponse])
async def create_review(
    data: ReviewCreate,
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = ReviewService(db)
    review = await service.create(current_user.user_id, data)
    return APIResponse(message="Review created successfully", data=review)


@router.patch("/{review_id}", response_model=APIResponse[ReviewResponse])
async def update_review(
    review_id: int,
    data: ReviewUpdate,
    current_user: CurrentUser = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    service = ReviewService(db)
    review = await service.update(review_id, current_user.user_id, data)
    return APIResponse(message="Review updated successfully", data=review)

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_customer, require_auth, CurrentUser
from app.schemas.review import ReviewCreate, ReviewUpdate, ReviewResponse
from app.schemas.base import APIResponse, PaginatedResponse
from app.services.review import ReviewService

router = APIRouter(tags=["Reviews"])


@router.get("/listings/{listing_id}/reviews", response_model=APIResponse[list[ReviewResponse]])
async def list_listing_reviews(
    listing_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = ReviewService(db)
    items, total = await service.list_by_listing(listing_id, skip, limit)
    return APIResponse(
        data=[ReviewResponse.model_validate(r) for r in items],
        message=f"total:{total}",
    )


@router.post("/listings/{listing_id}/reviews", response_model=APIResponse[ReviewResponse])
async def create_listing_review(
    listing_id: int,
    data: ReviewCreate,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = ReviewService(db)
    review = await service.create(current_user.user_id, listing_id, data)
    return APIResponse(
        message="Review created successfully",
        data=ReviewResponse.model_validate(review),
    )


@router.patch("/reviews/{review_id}", response_model=APIResponse[ReviewResponse])
async def update_review(
    review_id: int,
    data: ReviewUpdate,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = ReviewService(db)
    review = await service.update(review_id, current_user.user_id, data)
    return APIResponse(
        message="Review updated successfully",
        data=ReviewResponse.model_validate(review),
    )


@router.delete("/reviews/{review_id}", response_model=APIResponse)
async def delete_review(
    review_id: int,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = ReviewService(db)
    await service.delete(review_id, current_user.user_id, is_admin=current_user.is_admin)
    return APIResponse(message="Review deleted successfully")
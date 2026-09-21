from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_admin, get_current_user, CurrentUser
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.schemas.base import APIResponse, PaginatedResponse
from app.services.category import CategoryService

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.post("", response_model=APIResponse[CategoryResponse])
async def create_category(
    data: CategoryCreate,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = CategoryService(db)
    category = await service.create(data)
    return APIResponse(message="Category created successfully", data=category)


@router.get("", response_model=PaginatedResponse[CategoryResponse])
async def list_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = CategoryService(db)
    items = await service.get_all_with_subcategories(skip, limit)
    total = await service.count()
    return PaginatedResponse(
        data=items,
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.get("/{category_id}", response_model=APIResponse[CategoryResponse])
async def get_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    service = CategoryService(db)
    category = await service.get_by_id(category_id)
    return APIResponse(data=category)


@router.put("/{category_id}", response_model=APIResponse[CategoryResponse])
async def update_category(
    category_id: int,
    data: CategoryUpdate,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = CategoryService(db)
    category = await service.update(category_id, data)
    return APIResponse(message="Category updated successfully", data=category)


@router.delete("/{category_id}", response_model=APIResponse)
async def delete_category(
    category_id: int,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = CategoryService(db)
    await service.delete(category_id)
    return APIResponse(message="Category deleted successfully")

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.repositories.category import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.models.category import Category


class CategoryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = CategoryRepository(db)

    async def create(self, data: CategoryCreate) -> Category:
        existing = await self.repo.get_by_name(data.name)
        if existing:
            from fastapi import HTTPException
            raise HTTPException(status_code=409, detail="Category with this name already exists")
        return await self.repo.create(**data.model_dump())

    async def get_by_id(self, category_id: int) -> Optional[Category]:
        return await self.repo.get_by_id(category_id)

    async def get_all(self, skip: int = 0, limit: int = 20) -> list[Category]:
        return await self.repo.get_all(skip, limit)

    async def get_all_with_subcategories(self, skip: int = 0, limit: int = 20) -> list[CategoryResponse]:
        result = await self.db.execute(
            select(Category).where(Category.is_active == True).order_by(Category.sort_order).offset(skip).limit(limit)
        )
        categories = list(result.scalars().all())
        return [CategoryResponse.model_validate(c) for c in categories]

    async def count(self) -> int:
        return await self.repo.count()

    async def update(self, category_id: int, data: CategoryUpdate) -> Category:
        category = await self.repo.get_by_id(category_id)
        if not category:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Category not found")
        update_data = data.model_dump(exclude_unset=True)
        if "name" in update_data:
            existing = await self.repo.get_by_name(update_data["name"])
            if existing and existing.id != category_id:
                from fastapi import HTTPException
                raise HTTPException(status_code=409, detail="Category with this name already exists")
        return await self.repo.update(category, **update_data)

    async def delete(self, category_id: int) -> None:
        category = await self.repo.get_by_id(category_id)
        if not category:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Category not found")
        await self.repo.delete(category)

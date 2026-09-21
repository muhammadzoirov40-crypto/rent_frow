from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class SubCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    name: str
    icon: Optional[str] = None


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    name_tj: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    name_tj: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    name_tj: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool
    sort_order: int
    created_at: datetime
    subcategories: list[SubCategoryResponse] = []

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    title: str
    content: str
    image_url: Optional[str] = None
    likes_count: int = 0
    comments_count: int = 0
    author_name: Optional[str] = None
    author_avatar: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CreatePostRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    image_url: Optional[str] = None
    category_id: Optional[int] = None


class UpdatePostRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    image_url: Optional[str] = None
    category_id: Optional[int] = None

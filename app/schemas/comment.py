from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    user_id: int
    content: str
    author_name: Optional[str] = None
    author_avatar: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CreateCommentRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


class UpdateCommentRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)

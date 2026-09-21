from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.core.enums import UserRole


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    external_user_id: str
    role: UserRole
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    is_verified: bool = False
    rating_sum: float = 0
    rating_count: int = 0
    listing_count: int = 0
    created_at: datetime
    updated_at: datetime


class UpdateProfileRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=255)


class UpdateAvatarResponse(BaseModel):
    avatar_url: str

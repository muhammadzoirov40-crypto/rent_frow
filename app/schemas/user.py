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
    dc_account: Optional[str] = None
    is_verified: bool = False
    is_active: bool = True
    rating_sum: float = 0
    rating_count: int = 0
    listing_count: int = 0
    created_at: datetime
    updated_at: datetime


class UpdateProfileRequest(BaseModel):
    # both partial: a client that only sends one field leaves the other alone.
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    dc_account: Optional[str] = Field(None, max_length=50)


class UpdateAvatarResponse(BaseModel):
    avatar_url: str

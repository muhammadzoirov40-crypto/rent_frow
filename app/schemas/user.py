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
    # all partial: a client that only sends one field leaves the others alone.
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    # Editable here and nowhere else. The profile screen has always offered
    # this field; the schema simply never listed it, so the number was dropped
    # on the way in and the screen showed the old one back as if it had stuck.
    phone: Optional[str] = Field(None, max_length=32)
    dc_account: Optional[str] = Field(None, max_length=50)


class UpdateAvatarResponse(BaseModel):
    avatar_url: str

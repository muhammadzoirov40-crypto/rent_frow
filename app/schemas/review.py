from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ReviewCreate(BaseModel):
    equipment_id: int
    booking_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = None


class ReviewUpdate(BaseModel):
    rating: int | None = Field(None, ge=1, le=5)
    comment: str | None = None


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    equipment_id: int
    booking_id: int
    rating: int
    comment: str | None = None
    created_at: datetime
    customer_name: str | None = None
    equipment_name: str | None = None

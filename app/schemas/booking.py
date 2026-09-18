from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.core.enums import BookingStatus


class BookingCreate(BaseModel):
    equipment_id: int
    start_date: date
    end_date: date

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v, info):
        if "start_date" in info.data and v <= info.data["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v


class BookingUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    equipment_id: int
    start_date: date
    end_date: date
    total_price: float
    deposit_amount: float
    status: BookingStatus
    created_at: datetime
    updated_at: datetime

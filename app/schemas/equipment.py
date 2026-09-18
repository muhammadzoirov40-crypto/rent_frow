from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.core.enums import EquipmentStatus, EquipmentCondition


class EquipmentCreate(BaseModel):
    category_id: int
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    serial_number: str = Field(..., min_length=1, max_length=255)
    price_per_day: float = Field(..., gt=0)
    deposit_amount: float = Field(..., ge=0)
    status: EquipmentStatus = EquipmentStatus.AVAILABLE
    condition: EquipmentCondition = EquipmentCondition.GOOD
    image_url: Optional[str] = None
    is_active: bool = True


class EquipmentUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    serial_number: Optional[str] = Field(None, min_length=1, max_length=255)
    price_per_day: Optional[float] = Field(None, gt=0)
    deposit_amount: Optional[float] = Field(None, ge=0)
    status: Optional[EquipmentStatus] = None
    condition: Optional[EquipmentCondition] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class EquipmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    category_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    serial_number: str
    price_per_day: float
    deposit_amount: float
    status: EquipmentStatus
    condition: EquipmentCondition
    image_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AvailabilityCheck(BaseModel):
    equipment_id: int
    start_date: date
    end_date: date

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v, info):
        if "start_date" in info.data and v <= info.data["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v


class AvailabilityResponse(BaseModel):
    equipment_id: int
    available: bool
    conflicting_booking_id: Optional[int] = None

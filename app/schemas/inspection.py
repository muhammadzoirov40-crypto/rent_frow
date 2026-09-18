from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.core.enums import EquipmentCondition


class InspectionCreate(BaseModel):
    rental_id: int
    condition_before: Optional[str] = None
    condition_after: Optional[str] = None
    damage_found: bool = False
    damage_description: Optional[str] = None
    damage_cost: float = Field(0.0, ge=0)
    notes: Optional[str] = None


class InspectionUpdate(BaseModel):
    condition_after: Optional[str] = None
    damage_found: Optional[bool] = None
    damage_description: Optional[str] = None
    damage_cost: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class InspectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rental_id: int
    equipment_id: int
    inspector_id: int
    condition_before: Optional[str] = None
    condition_after: Optional[str] = None
    damage_found: bool
    damage_description: Optional[str] = None
    damage_cost: float
    notes: Optional[str] = None
    created_at: datetime

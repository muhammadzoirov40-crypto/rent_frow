from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.core.enums import MaintenanceStatus


class MaintenanceCreate(BaseModel):
    equipment_id: int
    reason: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    cost: float = Field(0.0, ge=0)


class MaintenanceUpdate(BaseModel):
    reason: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[MaintenanceStatus] = None
    cost: Optional[float] = Field(None, ge=0)


class MaintenanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    equipment_id: int
    reason: str
    description: Optional[str] = None
    status: MaintenanceStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cost: float
    created_at: datetime

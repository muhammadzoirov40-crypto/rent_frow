from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.core.enums import RentalStatus


class RentalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int
    equipment_id: int
    customer_id: int
    pickup_at: Optional[datetime] = None
    expected_return_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    status: RentalStatus
    created_at: datetime
    updated_at: datetime


class ReturnRequest(BaseModel):
    notes: Optional[str] = None

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.core.enums import RentalRequestStatus


class RentalRequestCreate(BaseModel):
    listing_id: int
    start_date: date
    end_date: date
    message: Optional[str] = None


class RentalRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    listing_id: int
    renter_id: int
    owner_id: int
    start_date: date
    end_date: date
    total_days: int
    total_price: float
    deposit_amount: float
    message: Optional[str] = None
    owner_response: Optional[str] = None
    status: RentalRequestStatus
    created_at: datetime
    updated_at: datetime
    listing_title: Optional[str] = None
    renter_name: Optional[str] = None
    owner_name: Optional[str] = None

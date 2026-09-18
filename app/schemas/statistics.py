from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    old_data: Optional[dict] = None
    new_data: Optional[dict] = None
    created_at: datetime


class StatisticsResponse(BaseModel):
    total_equipment: int = 0
    available_equipment: int = 0
    rented_equipment: int = 0
    maintenance_equipment: int = 0
    total_bookings: int = 0
    pending_bookings: int = 0
    confirmed_bookings: int = 0
    total_rentals: int = 0
    active_rentals: int = 0
    total_revenue: float = 0.0
    total_penalties: float = 0.0
    total_customers: int = 0


class AdminUserUpdate(BaseModel):
    role: Optional[str] = None

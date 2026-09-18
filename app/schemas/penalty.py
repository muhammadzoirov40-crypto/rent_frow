from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.core.enums import PenaltyStatus


class PenaltyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rental_id: int
    customer_id: int
    reason: str
    amount: float
    status: PenaltyStatus
    created_at: datetime

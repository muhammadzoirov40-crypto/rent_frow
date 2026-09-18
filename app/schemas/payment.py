from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.core.enums import PaymentType, PaymentStatus


class PaymentCreate(BaseModel):
    booking_id: int
    amount: float = Field(..., gt=0)
    payment_type: PaymentType
    transaction_id: Optional[str] = None


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int
    customer_id: int
    amount: float
    payment_type: PaymentType
    status: PaymentStatus
    transaction_id: Optional[str] = None
    created_at: datetime


class PaymentConfirm(BaseModel):
    transaction_id: str = Field(..., min_length=1)

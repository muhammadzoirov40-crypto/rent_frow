from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import WalletTransactionType


class WalletSummary(BaseModel):
    """Available vs reserved, straight from the backend."""

    balance: float
    held: float
    total: float
    currency: str = "TJS"


class WalletTopUpRequest(BaseModel):
    amount: float = Field(..., gt=0, le=1_000_000)
    description: Optional[str] = None


class WalletTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: float
    held_amount: float
    type: WalletTransactionType
    rental_request_id: Optional[int] = None
    listing_title: Optional[str] = None
    description: Optional[str] = None
    balance_after: float
    held_after: float
    created_at: datetime

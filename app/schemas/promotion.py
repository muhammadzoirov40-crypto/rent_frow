from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict

from app.core.enums import TopPromotionPayment, TopPromotionStatus


class TopPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    duration_key: str
    price: float
    is_active: bool
    created_at: datetime


class TopPlanCreate(BaseModel):
    """Admin-only. The client may send a price - only because an admin is the
    one sending it; a regular user's request body never reaches this schema."""

    name: str = Field(..., min_length=1, max_length=100)
    duration_key: str = Field(..., min_length=1, max_length=8)
    price: float = Field(default=0, ge=0)
    is_active: bool = False


class TopPlanUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    duration_key: Optional[str] = Field(None, min_length=1, max_length=8)
    price: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None


class TopPromotionCreate(BaseModel):
    """All a user may decide: *this* listing, *that* plan. Price, status,
    owner and both timestamps are computed server-side from the plan row."""

    listing_id: int
    plan_id: int


class TopReject(BaseModel):
    reason: Optional[str] = Field(None, max_length=1000)


class TopPromotionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    listing_id: int
    listing_title: Optional[str] = None
    user_id: int
    user_name: Optional[str] = None
    plan_id: int
    plan_name: str
    duration_key: str
    price: float
    status: TopPromotionStatus
    payment_status: TopPromotionPayment
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    reject_reason: Optional[str] = None
    created_at: datetime


class TopCreateResponse(BaseModel):
    """What the "Make TOP" modal needs back: the record plus whether the
    window is already live (wallet charge succeeded / price was 0) or still
    waiting for an admin."""

    promotion: TopPromotionResponse
    active: bool


class TopDcPayResponse(BaseModel):
    """The DC Wallet (Dushanbe City) checkout for a TOP promotion: the link
    to open, the reference the callback will echo back, and the still-pending
    record that reference activates - the price never leaves the server."""

    url: str
    reference: str
    promotion: TopPromotionResponse


class TopStatsResponse(BaseModel):
    total: int
    active: int
    pending: int
    expired: int
    rejected: int
    cancelled: int
    # Sum of PAID promotions - only money that actually left a wallet. Not a
    # projection, not "would-be revenue".
    revenue: float
    plans: list[TopPlanResponse]

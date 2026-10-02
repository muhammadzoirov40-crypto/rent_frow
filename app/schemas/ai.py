"""Schemas for the in-app AI assistant (`POST /api/v1/ai/chat`)."""
from typing import Literal, Optional

from pydantic import BaseModel, Field


class AIMessage(BaseModel):
    """One turn of chat history, echoed back by the client."""

    role: Literal["user", "assistant"]
    content: str = Field(default="", max_length=4000)


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: list[AIMessage] = Field(default_factory=list, max_length=30)


class AIListingCard(BaseModel):
    """Compact listing preview — the UI renders these as clickable cards."""

    id: int
    title: str
    price: float
    price_unit: str
    rooms: Optional[int] = None
    city_name: Optional[str] = None
    district_name: Optional[str] = None
    primary_image: Optional[str] = None
    average_rating: Optional[float] = None
    rating_count: int = 0
    available: bool = True


class AIChatResponse(BaseModel):
    reply: str
    listings: list[AIListingCard] = Field(default_factory=list)
    tools_used: list[str] = Field(default_factory=list)

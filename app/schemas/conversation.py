from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    sender_id: int
    content: str
    is_read: bool
    created_at: datetime
    sender_name: Optional[str] = None
    sender_avatar: Optional[str] = None


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user1_id: int
    user2_id: int
    listing_id: Optional[int] = None
    last_message_at: Optional[datetime] = None
    created_at: datetime
    other_user_name: Optional[str] = None
    other_user_avatar: Optional[str] = None
    last_message_content: Optional[str] = None
    unread_count: int = 0


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class ConversationCreateRequest(BaseModel):
    user_id: int
    listing_id: Optional[int] = None

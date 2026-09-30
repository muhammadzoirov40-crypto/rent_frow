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
    reply_to_id: Optional[int] = None
    reply_to_content: Optional[str] = None
    reply_to_sender_name: Optional[str] = None
    edited_at: Optional[datetime] = None
    pinned: bool = False
    reactions: dict[str, list[int]] = Field(default_factory=dict)
    forwarded_from_name: Optional[str] = None


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
    reply_to_id: Optional[int] = None
    forwarded_from_name: Optional[str] = Field(None, max_length=255)


class EditMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class ReactionRequest(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=16)


class PinMessageRequest(BaseModel):
    pinned: bool = True


class ConversationCreateRequest(BaseModel):
    user_id: int
    listing_id: Optional[int] = None

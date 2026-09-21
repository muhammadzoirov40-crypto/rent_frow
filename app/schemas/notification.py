from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    message: str
    type: str
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    is_read: bool
    created_at: datetime

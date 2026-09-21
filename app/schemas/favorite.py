from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class FavoriteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    listing_id: int
    created_at: datetime

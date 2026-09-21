from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    name_tj: Optional[str] = None
    is_active: bool


class DistrictResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    city_id: int
    name: str

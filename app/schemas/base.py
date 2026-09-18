from typing import Any, Generic, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = ""
    data: Optional[T] = None


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = ""
    data: Optional[list[T]] = None
    total: int = 0
    page: int = 1
    page_size: int = 20


class ErrorResponse(BaseModel):
    success: bool = False
    message: str

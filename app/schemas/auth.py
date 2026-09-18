from pydantic import BaseModel, Field, EmailStr
from app.core.enums import UserRole


class SendOtpRequest(BaseModel):
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)


class RegisterRequest(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.CUSTOMER
    otp_code: str = Field(..., min_length=6, max_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserBrief"


class UserBrief(BaseModel):
    id: int
    email: str
    role: UserRole


TokenResponse.model_rebuild()

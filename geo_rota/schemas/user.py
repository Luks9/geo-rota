from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from geo_rota.models.enums import RoleEnum


class UserBase(BaseModel):
    nome: str = Field(..., max_length=150)
    email: str
    role: RoleEnum = RoleEnum.USER


class UserCreate(UserBase):
    senha: str = Field(..., min_length=6, max_length=128)
    role: RoleEnum = RoleEnum.USER


class UserUpdate(BaseModel):
    nome: Optional[str] = Field(default=None, max_length=150)
    senha: Optional[str] = Field(default=None, min_length=6, max_length=128)
    role: Optional[RoleEnum] = None
    is_active: Optional[bool] = None


class UserRead(UserBase):
    id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[str] = None

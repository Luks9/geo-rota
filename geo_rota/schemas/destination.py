from pydantic import BaseModel, Field


class DestinoRotaBase(BaseModel):
    empresa_id: int
    nome: str = Field(..., max_length=120)
    logradouro: str = Field(..., max_length=150)
    numero: str = Field(..., max_length=20)
    complemento: str | None = Field(default=None, max_length=80)
    bairro: str = Field(..., max_length=80)
    cidade: str = Field(..., max_length=80)
    estado: str = Field(..., max_length=2, min_length=2)
    cep: str = Field(..., max_length=9, min_length=8)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    ativo: bool = True


class DestinoRotaCreate(DestinoRotaBase):
    pass


class DestinoRotaUpdate(BaseModel):
    nome: str | None = Field(default=None, max_length=120)
    logradouro: str | None = Field(default=None, max_length=150)
    numero: str | None = Field(default=None, max_length=20)
    complemento: str | None = Field(default=None, max_length=80)
    bairro: str | None = Field(default=None, max_length=80)
    cidade: str | None = Field(default=None, max_length=80)
    estado: str | None = Field(default=None, max_length=2, min_length=2)
    cep: str | None = Field(default=None, max_length=9, min_length=8)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    ativo: bool | None = None


class DestinoRotaRead(DestinoRotaBase):
    id: int

    class Config:
        from_attributes = True

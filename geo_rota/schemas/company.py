from pydantic import BaseModel, Field


class EmpresaBase(BaseModel):
    codigo: str = Field(..., max_length=50)
    nome: str = Field(..., max_length=150)
    endereco_base: str = Field(..., max_length=255)
    cidade: str = Field(..., max_length=80)
    estado: str = Field(..., min_length=2, max_length=2)
    cep: str = Field(..., max_length=9)


class EmpresaCreate(EmpresaBase):
    pass


class EmpresaUpdate(BaseModel):
    nome: str | None = Field(default=None, max_length=150)
    endereco_base: str | None = Field(default=None, max_length=255)
    cidade: str | None = Field(default=None, max_length=80)
    estado: str | None = Field(default=None, min_length=2, max_length=2)
    cep: str | None = Field(default=None, max_length=9)


class EmpresaRead(EmpresaBase):
    id: int

    class Config:
        from_attributes = True

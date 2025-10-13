from pydantic import BaseModel, Field

from geo_rota.models.enums import RegimeRotaEnum


class GrupoRotaBase(BaseModel):
    empresa_id: int
    nome: str = Field(..., max_length=80)
    tipo_regime: RegimeRotaEnum = RegimeRotaEnum.DIARIO
    dia_semana_padrao: int | None = Field(default=None, ge=0, le=6)
    descricao: str | None = None


class GrupoRotaCreate(GrupoRotaBase):
    pass


class GrupoRotaUpdate(BaseModel):
    nome: str | None = Field(default=None, max_length=80)
    tipo_regime: RegimeRotaEnum | None = None
    dia_semana_padrao: int | None = Field(default=None, ge=0, le=6)
    descricao: str | None = None


class GrupoRotaRead(GrupoRotaBase):
    id: int

    class Config:
        from_attributes = True


class FuncionarioGrupoRotaBase(BaseModel):
    funcionario_id: int
    grupo_rota_id: int
    dia_semana: int | None = Field(default=None, ge=0, le=6)


class FuncionarioGrupoRotaCreate(FuncionarioGrupoRotaBase):
    pass


class FuncionarioGrupoRotaRead(FuncionarioGrupoRotaBase):
    id: int

    class Config:
        from_attributes = True

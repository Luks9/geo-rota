from pydantic import BaseModel, Field, validator

from geo_rota.models.enums import RegimeRotaEnum


class GrupoRotaBase(BaseModel):
    empresa_id: int
    nome: str = Field(..., max_length=80)
    tipo_regime: RegimeRotaEnum = RegimeRotaEnum.DIARIO
    dias_semana_padrao: list[int] = Field(default_factory=list)
    descricao: str | None = None

    @validator("dias_semana_padrao", each_item=True)
    def validar_dias_semana(cls, dia: int) -> int:
        if dia < 0 or dia > 6:
            raise ValueError("Os dias da semana devem estar entre 0 (segunda) e 6 (domingo).")
        return dia


class GrupoRotaCreate(GrupoRotaBase):
    pass


class GrupoRotaUpdate(BaseModel):
    nome: str | None = Field(default=None, max_length=80)
    tipo_regime: RegimeRotaEnum | None = None
    dias_semana_padrao: list[int] | None = None
    descricao: str | None = None

    @validator("dias_semana_padrao", each_item=True)
    def validar_dias_semana(cls, dia: int) -> int:
        if dia < 0 or dia > 6:
            raise ValueError("Os dias da semana devem estar entre 0 (segunda) e 6 (domingo).")
        return dia


class GrupoRotaRead(GrupoRotaBase):
    id: int

    class Config:
        from_attributes = True


class FuncionarioGrupoRotaInput(BaseModel):
    grupo_rota_id: int


class FuncionarioGrupoRotaBase(FuncionarioGrupoRotaInput):
    funcionario_id: int


class FuncionarioGrupoRotaCreate(FuncionarioGrupoRotaBase):
    pass


class FuncionarioGrupoRotaRead(FuncionarioGrupoRotaBase):
    id: int
    grupo_nome: str | None = None

    class Config:
        from_attributes = True

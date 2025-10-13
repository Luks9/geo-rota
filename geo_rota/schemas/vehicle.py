from datetime import date, datetime

from pydantic import BaseModel, Field

from geo_rota.models.enums import CategoriaCustoVeiculo, TipoDisponibilidadeVeiculoEnum


class VeiculoBase(BaseModel):
    empresa_id: int
    placa: str = Field(..., max_length=10)
    tipo: str = Field(..., max_length=40)
    capacidade_passageiros: int = Field(..., ge=1)
    consumo_medio_km_l: float = Field(..., gt=0)
    categoria_custo: CategoriaCustoVeiculo = CategoriaCustoVeiculo.BAIXO
    ativo: bool = True


class VeiculoCreate(VeiculoBase):
    pass


class VeiculoUpdate(BaseModel):
    placa: str | None = Field(default=None, max_length=10)
    tipo: str | None = Field(default=None, max_length=40)
    capacidade_passageiros: int | None = Field(default=None, ge=1)
    consumo_medio_km_l: float | None = Field(default=None, gt=0)
    categoria_custo: CategoriaCustoVeiculo | None = None
    ativo: bool | None = None


class VeiculoRead(VeiculoBase):
    id: int

    class Config:
        from_attributes = True


class DisponibilidadeVeiculoBase(BaseModel):
    veiculo_id: int
    tipo: TipoDisponibilidadeVeiculoEnum
    inicio_periodo: date
    fim_periodo: date
    dias_semana: str | None = Field(default=None, max_length=20)
    renovacao_mensal: bool = False
    grupo_rota_id: int | None = None
    observacoes: str | None = None
    ativo: bool = True


class DisponibilidadeVeiculoCreate(DisponibilidadeVeiculoBase):
    pass


class DisponibilidadeVeiculoUpdate(BaseModel):
    tipo: TipoDisponibilidadeVeiculoEnum | None = None
    inicio_periodo: date | None = None
    fim_periodo: date | None = None
    dias_semana: str | None = Field(default=None, max_length=20)
    renovacao_mensal: bool | None = None
    grupo_rota_id: int | None = None
    observacoes: str | None = None
    ativo: bool | None = None


class DisponibilidadeVeiculoRead(DisponibilidadeVeiculoBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True

from datetime import date, datetime

from pydantic import BaseModel, Field

from geo_rota.models.enums import (
    ModoAlgoritmoEnum,
    PapelAtribuicaoRota,
    StatusRotaEnum,
    TurnoTrabalhoEnum,
)


class AtribuicaoRotaBase(BaseModel):
    funcionario_id: int
    papel: PapelAtribuicaoRota = PapelAtribuicaoRota.PASSAGEIRO
    ordem_embarque: int | None = Field(default=None, ge=0)
    hora_embarque: str | None = Field(default=None, max_length=5)


class AtribuicaoRotaCreate(AtribuicaoRotaBase):
    rota_id: int


class AtribuicaoRotaRead(AtribuicaoRotaBase):
    id: int
    rota_id: int

    class Config:
        from_attributes = True


class FuncionarioPendenteRotaBase(BaseModel):
    funcionario_id: int
    data_agendada: date
    turno: TurnoTrabalhoEnum
    motivo: str
    grupo_rota_id: int | None = None


class FuncionarioPendenteRotaCreate(FuncionarioPendenteRotaBase):
    rota_id: int | None = None


class FuncionarioPendenteRotaRead(FuncionarioPendenteRotaBase):
    id: int
    rota_id: int | None = None

    class Config:
        from_attributes = True


class LogAdministrativoRead(BaseModel):
    id: int
    rota_id: int
    responsavel: str
    acao: str
    detalhes: str | None = None
    criado_em: datetime

    class Config:
        from_attributes = True


class LogGeracaoRotaRead(BaseModel):
    id: int
    rota_id: int
    gerado_em: datetime
    quantidade_funcionarios: int
    veiculo_id: int | None = None
    disponibilidade_veiculo_id: int | None = None
    motorista_id: int | None = None
    observacoes: str | None = None

    class Config:
        from_attributes = True


class LogErroRotaRead(BaseModel):
    id: int
    rota_id: int | None = None
    registrado_em: datetime
    contexto: str
    mensagem: str
    detalhes: str | None = None

    class Config:
        from_attributes = True


class SugestaoVeiculoExtra(BaseModel):
    tipo: str
    quantidade: int
    capacidade_por_veiculo: int
    passageiros_atendidos: int


class RequisicaoGerarRota(BaseModel):
    empresa_id: int
    grupo_rota_id: int
    data_agendada: date
    turno: TurnoTrabalhoEnum
    motorista_id: int | None = None
    veiculo_id: int | None = None
    modo_geracao: ModoAlgoritmoEnum = ModoAlgoritmoEnum.AUTOMATICO


class RotaBase(BaseModel):
    empresa_id: int
    grupo_rota_id: int
    data_agendada: date
    turno: TurnoTrabalhoEnum
    status: StatusRotaEnum = StatusRotaEnum.RASCUNHO
    modo_geracao: ModoAlgoritmoEnum = ModoAlgoritmoEnum.AUTOMATICO
    veiculo_id: int | None = None
    disponibilidade_veiculo_id: int | None = None
    motorista_id: int | None = None
    distancia_total_km: float | None = Field(default=None, ge=0)
    custo_operacional_total: float | None = Field(default=None, ge=0)
    observacoes: str | None = None


class RotaCreate(RotaBase):
    pass


class RotaUpdate(BaseModel):
    grupo_rota_id: int | None = None
    data_agendada: date | None = None
    turno: TurnoTrabalhoEnum | None = None
    status: StatusRotaEnum | None = None
    modo_geracao: ModoAlgoritmoEnum | None = None
    veiculo_id: int | None = None
    motorista_id: int | None = None
    distancia_total_km: float | None = Field(default=None, ge=0)
    custo_operacional_total: float | None = Field(default=None, ge=0)
    observacoes: str | None = None


class RotaRead(RotaBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime
    atribuicoes: list[AtribuicaoRotaRead] = Field(default_factory=list)
    funcionarios_pendentes: list[FuncionarioPendenteRotaRead] = Field(default_factory=list)
    logs_geracao: list[LogGeracaoRotaRead] = Field(default_factory=list)
    logs_administrativos: list[LogAdministrativoRead] = Field(default_factory=list)
    logs_erros: list[LogErroRotaRead] = Field(default_factory=list)
    sugestoes_veiculos: list[SugestaoVeiculoExtra] = Field(default_factory=list)

    class Config:
        from_attributes = True

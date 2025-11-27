from datetime import date, time

from pydantic import BaseModel, EmailStr, Field

from geo_rota.models.enums import TipoIndisponibilidadeEnum, TurnoTrabalhoEnum
from geo_rota.schemas.route_group import FuncionarioGrupoRotaInput, FuncionarioGrupoRotaRead


class EscalaTrabalhoBase(BaseModel):
    dia_semana: int = Field(..., ge=0, le=6)
    turno: TurnoTrabalhoEnum
    disponivel: bool = True
    hora_inicio: time | None = None
    hora_fim: time | None = None


class EscalaTrabalhoCreate(EscalaTrabalhoBase):
    funcionario_id: int


class EscalaTrabalhoUpdate(BaseModel):
    disponivel: bool | None = None
    turno: TurnoTrabalhoEnum | None = None
    hora_inicio: time | None = None
    hora_fim: time | None = None


class EscalaTrabalhoRead(EscalaTrabalhoBase):
    id: int
    funcionario_id: int

    class Config:
        from_attributes = True


class EscalaTrabalhoInput(EscalaTrabalhoBase):
    pass


class FuncionarioBase(BaseModel):
    nome_completo: str = Field(..., max_length=150)
    cpf: str = Field(..., max_length=14)
    email: EmailStr | None = None
    telefone: str | None = Field(default=None, max_length=20)

    logradouro: str = Field(..., max_length=150)
    numero: str = Field(..., max_length=20)
    complemento: str | None = Field(default=None, max_length=80)
    bairro: str = Field(..., max_length=80)
    cidade: str = Field(..., max_length=80)
    estado: str = Field(..., min_length=2, max_length=2)
    cep: str = Field(..., max_length=9)

    possui_cnh: bool = False
    categoria_cnh: str | None = Field(default=None, max_length=5)
    cnh_valida_ate: date | None = None
    apto_dirigir: bool = False
    ativo: bool = True


class FuncionarioCreate(FuncionarioBase):
    empresa_id: int


class FuncionarioUpdate(BaseModel):
    nome_completo: str | None = Field(default=None, max_length=150)
    email: EmailStr | None = None
    telefone: str | None = Field(default=None, max_length=20)
    logradouro: str | None = Field(default=None, max_length=150)
    numero: str | None = Field(default=None, max_length=20)
    complemento: str | None = Field(default=None, max_length=80)
    bairro: str | None = Field(default=None, max_length=80)
    cidade: str | None = Field(default=None, max_length=80)
    estado: str | None = Field(default=None, min_length=2, max_length=2)
    cep: str | None = Field(default=None, max_length=9)
    possui_cnh: bool | None = None
    categoria_cnh: str | None = Field(default=None, max_length=5)
    cnh_valida_ate: date | None = None
    apto_dirigir: bool | None = None
    ativo: bool | None = None


class FuncionarioRead(FuncionarioBase):
    id: int
    empresa_id: int
    grupos_rota: list[FuncionarioGrupoRotaRead] = Field(default_factory=list)

    class Config:
        from_attributes = True


class IndisponibilidadeFuncionarioBase(BaseModel):
    tipo: TipoIndisponibilidadeEnum
    motivo: str | None = Field(default=None, max_length=200)
    data_inicio: date
    data_fim: date


class IndisponibilidadeFuncionarioCreate(IndisponibilidadeFuncionarioBase):
    funcionario_id: int


class IndisponibilidadeFuncionarioUpdate(BaseModel):
    tipo: TipoIndisponibilidadeEnum | None = None
    motivo: str | None = Field(default=None, max_length=200)
    data_inicio: date | None = None
    data_fim: date | None = None


class IndisponibilidadeFuncionarioRead(IndisponibilidadeFuncionarioBase):
    id: int
    funcionario_id: int

    class Config:
        from_attributes = True


class FuncionarioComDetalhes(FuncionarioRead):
    escalas_trabalho: list[EscalaTrabalhoRead] = Field(default_factory=list)
    indisponibilidades: list[IndisponibilidadeFuncionarioRead] = Field(default_factory=list)

    class Config:
        from_attributes = True


class FuncionarioCreatePayload(FuncionarioCreate):
    escalas_trabalho: list[EscalaTrabalhoInput] = Field(default_factory=list)
    grupos_rota: list[FuncionarioGrupoRotaInput] = Field(default_factory=list)


class FuncionarioUpdatePayload(FuncionarioUpdate):
    escalas_trabalho: list[EscalaTrabalhoInput] | None = None
    grupos_rota: list[FuncionarioGrupoRotaInput] | None = None

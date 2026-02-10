from datetime import datetime

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from geo_rota.models.enums import (
    ModoAlgoritmoEnum,
    PapelAtribuicaoRota,
    StatusRotaEnum,
    TurnoTrabalhoEnum,
)
from geo_rota.models.model_base import Base


class Rota(Base):
    __tablename__ = "rotas"
    __table_args__ = (
        UniqueConstraint(
            "data_agendada",
            "turno",
            "grupo_rota_id",
            "sequencia_planejamento",
            name="uq_rotas_por_grupo_turno_seq",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    grupo_rota_id = Column(Integer, ForeignKey("grupos_rota.id"), nullable=False, index=True)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=True, index=True)
    motorista_id = Column(Integer, ForeignKey("funcionarios.id"), nullable=True, index=True)
    disponibilidade_veiculo_id = Column(
        Integer,
        ForeignKey("disponibilidades_veiculo.id"),
        nullable=True,
        index=True,
    )
    destino_id = Column(Integer, ForeignKey("destinos_rota.id"), nullable=True, index=True)

    data_agendada = Column(Date, nullable=False)
    turno = Column(SAEnum(TurnoTrabalhoEnum, name="turno_rota_enum", native_enum=False), nullable=False)
    status = Column(
        SAEnum(StatusRotaEnum, name="status_rota_enum", native_enum=False),
        default=StatusRotaEnum.RASCUNHO,
        nullable=False,
    )
    modo_geracao = Column(
        SAEnum(ModoAlgoritmoEnum, name="modo_algoritmo_enum", native_enum=False),
        default=ModoAlgoritmoEnum.AUTOMATICO,
        nullable=False,
    )

    sequencia_planejamento = Column(Integer, nullable=False, default=1)
    distancia_total_km = Column(Float, nullable=True)
    custo_operacional_total = Column(Numeric(12, 2), nullable=True)
    observacoes = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    empresa = relationship("Empresa", back_populates="rotas")
    grupo_rota = relationship("GrupoRota", back_populates="rotas")
    veiculo = relationship("Veiculo", back_populates="rotas")
    disponibilidade_veiculo = relationship("DisponibilidadeVeiculo", back_populates="rotas")
    motorista = relationship("Funcionario", back_populates="rotas_conduzidas", foreign_keys=[motorista_id])
    destino = relationship("DestinoRota", back_populates="rotas")
    atribuicoes = relationship(
        "AtribuicaoRota",
        back_populates="rota",
        cascade="all,delete-orphan",
    )
    funcionarios_pendentes = relationship(
        "FuncionarioPendenteRota",
        back_populates="rota",
        cascade="all,delete-orphan",
    )
    logs_geracao = relationship(
        "LogGeracaoRota",
        back_populates="rota",
        cascade="all,delete-orphan",
    )
    logs_administrativos = relationship(
        "LogAdministrativo",
        back_populates="rota",
        cascade="all,delete-orphan",
    )
    logs_erros = relationship(
        "LogErroRota",
        back_populates="rota",
        cascade="all,delete-orphan",
    )


class AtribuicaoRota(Base):
    __tablename__ = "atribuicoes_rota"
    __table_args__ = (
        UniqueConstraint("rota_id", "funcionario_id", name="uq_atribuicoes_rota_funcionario"),
    )

    id = Column(Integer, primary_key=True, index=True)
    rota_id = Column(Integer, ForeignKey("rotas.id"), nullable=False, index=True)
    funcionario_id = Column(Integer, ForeignKey("funcionarios.id"), nullable=False, index=True)
    papel = Column(
        SAEnum(PapelAtribuicaoRota, name="papel_atribuicao_rota_enum", native_enum=False),
        default=PapelAtribuicaoRota.PASSAGEIRO,
        nullable=False,
    )
    ordem_embarque = Column(Integer, nullable=True)
    hora_embarque = Column(String(5), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    rota = relationship("Rota", back_populates="atribuicoes")
    funcionario = relationship("Funcionario", back_populates="atribuicoes_rota")


class FuncionarioPendenteRota(Base):
    __tablename__ = "funcionarios_pendentes_rota"

    id = Column(Integer, primary_key=True, index=True)
    rota_id = Column(Integer, ForeignKey("rotas.id"), nullable=True, index=True)
    funcionario_id = Column(Integer, ForeignKey("funcionarios.id"), nullable=False, index=True)
    data_agendada = Column(Date, nullable=False)
    turno = Column(SAEnum(TurnoTrabalhoEnum, name="turno_pendente_enum", native_enum=False), nullable=False)
    motivo = Column(Text, nullable=False)
    grupo_rota_id = Column(Integer, ForeignKey("grupos_rota.id"), nullable=True, index=True)

    rota = relationship("Rota", back_populates="funcionarios_pendentes")
    funcionario = relationship("Funcionario")
    grupo_rota = relationship("GrupoRota")


class LogGeracaoRota(Base):
    __tablename__ = "logs_geracao_rota"

    id = Column(Integer, primary_key=True, index=True)
    rota_id = Column(Integer, ForeignKey("rotas.id"), nullable=False, index=True)
    gerado_em = Column(DateTime, default=datetime.utcnow, nullable=False)
    quantidade_funcionarios = Column(Integer, nullable=False)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=True)
    motorista_id = Column(Integer, ForeignKey("funcionarios.id"), nullable=True)
    observacoes = Column(Text, nullable=True)

    rota = relationship("Rota", back_populates="logs_geracao")
    veiculo = relationship("Veiculo")
    motorista = relationship("Funcionario")


class LogAdministrativo(Base):
    __tablename__ = "logs_administrativos"

    id = Column(Integer, primary_key=True, index=True)
    rota_id = Column(Integer, ForeignKey("rotas.id"), nullable=False, index=True)
    responsavel = Column(String(120), nullable=False)
    acao = Column(String(80), nullable=False)
    detalhes = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)

    rota = relationship("Rota", back_populates="logs_administrativos")


class LogErroRota(Base):
    __tablename__ = "logs_erros_rota"

    id = Column(Integer, primary_key=True, index=True)
    rota_id = Column(Integer, ForeignKey("rotas.id"), nullable=True, index=True)
    registrado_em = Column(DateTime, default=datetime.utcnow, nullable=False)
    contexto = Column(String(120), nullable=False)
    mensagem = Column(Text, nullable=False)
    detalhes = Column(Text, nullable=True)

    rota = relationship("Rota", back_populates="logs_erros")

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from geo_rota.models.enums import TipoDisponibilidadeVeiculoEnum
from geo_rota.models.model_base import Base


class DisponibilidadeVeiculo(Base):
    __tablename__ = "disponibilidades_veiculo"
    __table_args__ = (
        UniqueConstraint("veiculo_id", "inicio_periodo", "fim_periodo", name="uq_disponibilidades_periodo"),
    )

    id = Column(Integer, primary_key=True, index=True)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=False, index=True)
    grupo_rota_id = Column(Integer, ForeignKey("grupos_rota.id"), nullable=True, index=True)
    tipo = Column(
        SAEnum(TipoDisponibilidadeVeiculoEnum, name="tipo_disponibilidade_veiculo_enum", native_enum=False),
        nullable=False,
    )
    inicio_periodo = Column(Date, nullable=False)
    fim_periodo = Column(Date, nullable=False)
    dias_semana = Column(String(20), nullable=True)  # Ex.: "1,2,3" para terça a quinta
    renovacao_mensal = Column(Boolean, default=False, nullable=False)
    observacoes = Column(Text, nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    veiculo = relationship("Veiculo", back_populates="disponibilidades")
    grupo_rota = relationship("GrupoRota", back_populates="disponibilidades")
    rotas = relationship("Rota", back_populates="disponibilidade_veiculo")

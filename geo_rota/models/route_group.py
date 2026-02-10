from sqlalchemy import Column, Enum as SAEnum, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from geo_rota.models.enums import RegimeRotaEnum
from geo_rota.models.model_base import Base


class GrupoRota(Base):
    __tablename__ = "grupos_rota"
    __table_args__ = (
        UniqueConstraint("empresa_id", "nome", name="uq_grupos_rota_empresa_nome"),
    )

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    nome = Column(String(80), nullable=False)
    tipo_regime = Column(
        SAEnum(RegimeRotaEnum, name="regime_rota_enum", native_enum=False),
        default=RegimeRotaEnum.DIARIO,
        nullable=False,
    )
    dias_semana_padrao = Column(JSON, nullable=False, default=list)
    descricao = Column(Text, nullable=True)

    empresa = relationship("Empresa", back_populates="grupos_rota")
    participacoes_funcionarios = relationship(
        "FuncionarioGrupoRota",
        back_populates="grupo_rota",
        cascade="all,delete-orphan",
    )
    rotas = relationship("Rota", back_populates="grupo_rota")
    disponibilidades = relationship(
        "DisponibilidadeVeiculo",
        back_populates="grupo_rota",
        cascade="all,delete-orphan",
    )

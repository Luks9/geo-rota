from sqlalchemy import Boolean, Column, Enum as SAEnum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from geo_rota.models.enums import CategoriaCustoVeiculo
from geo_rota.models.model_base import Base


class Veiculo(Base):
    __tablename__ = "veiculos"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    placa = Column(String(10), unique=True, nullable=False)
    tipo = Column(String(40), nullable=False)
    capacidade_passageiros = Column(Integer, nullable=False)
    consumo_medio_km_l = Column(Float, nullable=False)
    categoria_custo = Column(
        SAEnum(CategoriaCustoVeiculo, name="categoria_custo_veiculo_enum", native_enum=False),
        default=CategoriaCustoVeiculo.BAIXO,
        nullable=False,
    )
    ativo = Column(Boolean, default=True, nullable=False)

    empresa = relationship("Empresa", back_populates="veiculos")
    rotas = relationship("Rota", back_populates="veiculo")
    disponibilidades = relationship(
        "DisponibilidadeVeiculo",
        back_populates="veiculo",
        cascade="all,delete-orphan",
    )

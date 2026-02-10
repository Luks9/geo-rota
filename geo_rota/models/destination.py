from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from geo_rota.models.model_base import Base


class DestinoRota(Base):
    __tablename__ = "destinos_rota"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    nome = Column(String(120), nullable=False)
    logradouro = Column(String(150), nullable=False)
    numero = Column(String(20), nullable=False)
    complemento = Column(String(80), nullable=True)
    bairro = Column(String(80), nullable=False)
    cidade = Column(String(80), nullable=False, index=True)
    estado = Column(String(2), nullable=False)
    cep = Column(String(9), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)

    empresa = relationship("Empresa", back_populates="destinos")
    rotas = relationship("Rota", back_populates="destino")

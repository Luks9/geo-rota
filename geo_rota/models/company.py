from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from geo_rota.models.model_base import Base


class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, nullable=False)
    nome = Column(String(150), nullable=False)
    endereco_base = Column(String(255), nullable=False)
    cidade = Column(String(80), nullable=False)
    estado = Column(String(2), nullable=False)
    cep = Column(String(9), nullable=False)

    funcionarios = relationship("Funcionario", back_populates="empresa", cascade="all,delete-orphan")
    veiculos = relationship("Veiculo", back_populates="empresa", cascade="all,delete-orphan")
    grupos_rota = relationship("GrupoRota", back_populates="empresa", cascade="all,delete-orphan")
    rotas = relationship("Rota", back_populates="empresa", cascade="all,delete-orphan")
    destinos = relationship("DestinoRota", back_populates="empresa", cascade="all,delete-orphan")

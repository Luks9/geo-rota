from datetime import date

from sqlalchemy import Column, Date, Enum as SAEnum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from geo_rota.models.enums import TipoIndisponibilidadeEnum
from geo_rota.models.model_base import Base


class IndisponibilidadeFuncionario(Base):
    __tablename__ = "indisponibilidades_funcionarios"

    id = Column(Integer, primary_key=True, index=True)
    funcionario_id = Column(Integer, ForeignKey("funcionarios.id"), nullable=False, index=True)
    tipo = Column(SAEnum(TipoIndisponibilidadeEnum, name="tipo_indisponibilidade_enum", native_enum=False), nullable=False)
    motivo = Column(String(200), nullable=True)
    data_inicio = Column(Date, nullable=False)
    data_fim = Column(Date, nullable=False)

    funcionario = relationship("Funcionario", back_populates="indisponibilidades")

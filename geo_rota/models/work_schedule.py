from sqlalchemy import Boolean, Column, Enum as SAEnum, ForeignKey, Integer, Time, UniqueConstraint
from sqlalchemy.orm import relationship

from geo_rota.models.enums import TurnoTrabalhoEnum
from geo_rota.models.model_base import Base


class EscalaTrabalho(Base):
    __tablename__ = "escalas_trabalho"
    __table_args__ = (
        UniqueConstraint("funcionario_id", "dia_semana", "turno", name="uq_escalas_trabalho_funcionario_dia_turno"),
    )

    id = Column(Integer, primary_key=True, index=True)
    funcionario_id = Column(Integer, ForeignKey("funcionarios.id"), nullable=False, index=True)
    dia_semana = Column(Integer, nullable=False)  # 0 = segunda, 6 = domingo
    turno = Column(SAEnum(TurnoTrabalhoEnum, name="turno_trabalho_enum", native_enum=False), nullable=False)
    disponivel = Column(Boolean, default=True, nullable=False)
    hora_inicio = Column(Time, nullable=True)
    hora_fim = Column(Time, nullable=True)

    funcionario = relationship("Funcionario", back_populates="escalas_trabalho")

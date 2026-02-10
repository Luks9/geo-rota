from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from geo_rota.models.model_base import Base


class FuncionarioGrupoRota(Base):
    __tablename__ = "funcionarios_grupos_rota"
    __table_args__ = (
        UniqueConstraint("funcionario_id", "grupo_rota_id", name="uq_funcionarios_grupos_rota_por_grupo"),
    )

    id = Column(Integer, primary_key=True, index=True)
    funcionario_id = Column(Integer, ForeignKey("funcionarios.id"), nullable=False, index=True)
    grupo_rota_id = Column(Integer, ForeignKey("grupos_rota.id"), nullable=False, index=True)

    funcionario = relationship("Funcionario", back_populates="participacoes_grupo_rota")
    grupo_rota = relationship("GrupoRota", back_populates="participacoes_funcionarios")

    @property
    def grupo_nome(self) -> str | None:
        if self.grupo_rota is None:
            return None
        return self.grupo_rota.nome

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from geo_rota.models.model_base import Base


class Funcionario(Base):
    __tablename__ = "funcionarios"
    __table_args__ = (
        UniqueConstraint("cpf", name="uq_funcionarios_cpf"),
    )

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    nome_completo = Column(String(150), nullable=False, index=True)
    cpf = Column(String(14), nullable=False)
    email = Column(String(120), nullable=True, unique=True)
    telefone = Column(String(20), nullable=True)

    logradouro = Column(String(150), nullable=False)
    numero = Column(String(20), nullable=False)
    complemento = Column(String(80), nullable=True)
    bairro = Column(String(80), nullable=False)
    cidade = Column(String(80), nullable=False, index=True)
    estado = Column(String(2), nullable=False)
    cep = Column(String(9), nullable=False)

    possui_cnh = Column(Boolean, default=False, nullable=False)
    categoria_cnh = Column(String(5), nullable=True)
    cnh_valida_ate = Column(Date, nullable=True)
    apto_dirigir = Column(Boolean, default=False, nullable=False)

    ativo = Column(Boolean, default=True, nullable=False)

    empresa = relationship("Empresa", back_populates="funcionarios")
    escalas_trabalho = relationship(
        "EscalaTrabalho",
        back_populates="funcionario",
        cascade="all,delete-orphan",
    )
    participacoes_grupo_rota = relationship(
        "FuncionarioGrupoRota",
        back_populates="funcionario",
        cascade="all,delete-orphan",
    )
    atribuicoes_rota = relationship(
        "AtribuicaoRota",
        back_populates="funcionario",
        cascade="all,delete-orphan",
    )
    rotas_conduzidas = relationship(
        "Rota",
        back_populates="motorista",
        foreign_keys="Rota.motorista_id",
    )
    indisponibilidades = relationship(
        "IndisponibilidadeFuncionario",
        back_populates="funcionario",
        cascade="all,delete-orphan",
    )

    @property
    def grupos_rota(self):
        return self.participacoes_grupo_rota

    @grupos_rota.setter
    def grupos_rota(self, value):
        self.participacoes_grupo_rota = value

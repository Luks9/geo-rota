from typing import Any, Iterable, Optional

from sqlalchemy.orm import Session

from geo_rota.models import EscalaTrabalho, Funcionario, IndisponibilidadeFuncionario
from geo_rota.schemas import (
    EscalaTrabalhoCreate,
    EscalaTrabalhoInput,
    EscalaTrabalhoUpdate,
    FuncionarioCreatePayload,
    FuncionarioUpdatePayload,
    IndisponibilidadeFuncionarioCreate,
    IndisponibilidadeFuncionarioUpdate,
)


def _criar_escalas_para_funcionario(
    db: Session,
    funcionario_id: int,
    escalas: Iterable[EscalaTrabalhoInput | dict[str, Any]],
) -> None:
    for escala_input in escalas:
        escala_dados: dict[str, Any]
        if hasattr(escala_input, "dict"):
            escala_dados = escala_input.dict()
        else:
            escala_dados = dict(escala_input)
        escala = EscalaTrabalho(
            funcionario_id=funcionario_id,
            **escala_dados,
        )
        db.add(escala)


def criar_funcionario(db: Session, dados: FuncionarioCreatePayload) -> Funcionario:
    payload = dados.dict()
    escalas = payload.pop("escalas_trabalho", [])

    funcionario = Funcionario(**payload)
    db.add(funcionario)
    db.flush()  # garante ID para escalas

    if escalas:
        _criar_escalas_para_funcionario(db, funcionario.id, escalas)

    db.commit()
    db.refresh(funcionario)
    return funcionario


def listar_funcionarios(db: Session, empresa_id: Optional[int] = None) -> Iterable[Funcionario]:
    consulta = db.query(Funcionario)
    if empresa_id is not None:
        consulta = consulta.filter(Funcionario.empresa_id == empresa_id)
    return consulta.order_by(Funcionario.nome_completo).all()


def obter_funcionario(db: Session, funcionario_id: int) -> Optional[Funcionario]:
    return db.query(Funcionario).filter(Funcionario.id == funcionario_id).first()


def atualizar_funcionario(
    db: Session,
    funcionario_id: int,
    dados: FuncionarioUpdatePayload,
) -> Optional[Funcionario]:
    funcionario = obter_funcionario(db, funcionario_id)
    if not funcionario:
        return None

    payload = dados.dict(exclude_unset=True)
    escalas = payload.pop("escalas_trabalho", None)

    for campo, valor in payload.items():
        setattr(funcionario, campo, valor)

    if escalas is not None:
        for escala in list(funcionario.escalas_trabalho):
            db.delete(escala)
        db.flush()
        if escalas:
            _criar_escalas_para_funcionario(db, funcionario.id, escalas)

    db.commit()
    db.refresh(funcionario)
    return funcionario


def inativar_funcionario(db: Session, funcionario_id: int) -> bool:
    funcionario = obter_funcionario(db, funcionario_id)
    if not funcionario:
        return False
    funcionario.ativo = False
    db.commit()
    return True


def adicionar_escala_trabalho(db: Session, dados: EscalaTrabalhoCreate) -> EscalaTrabalho:
    escala = EscalaTrabalho(**dados.dict())
    db.add(escala)
    db.commit()
    db.refresh(escala)
    return escala


def atualizar_escala_trabalho(db: Session, escala_id: int, dados: EscalaTrabalhoUpdate) -> Optional[EscalaTrabalho]:
    escala = db.query(EscalaTrabalho).filter(EscalaTrabalho.id == escala_id).first()
    if not escala:
        return None

    for campo, valor in dados.dict(exclude_unset=True).items():
        setattr(escala, campo, valor)

    db.commit()
    db.refresh(escala)
    return escala


def remover_escala_trabalho(db: Session, escala_id: int) -> bool:
    escala = db.query(EscalaTrabalho).filter(EscalaTrabalho.id == escala_id).first()
    if not escala:
        return False

    db.delete(escala)
    db.commit()
    return True


def cadastrar_indisponibilidade(
    db: Session,
    dados: IndisponibilidadeFuncionarioCreate,
) -> IndisponibilidadeFuncionario:
    indisponibilidade = IndisponibilidadeFuncionario(**dados.dict())
    db.add(indisponibilidade)
    db.commit()
    db.refresh(indisponibilidade)
    return indisponibilidade


def listar_indisponibilidades(
    db: Session,
    funcionario_id: int,
) -> Iterable[IndisponibilidadeFuncionario]:
    return (
        db.query(IndisponibilidadeFuncionario)
        .filter(IndisponibilidadeFuncionario.funcionario_id == funcionario_id)
        .order_by(IndisponibilidadeFuncionario.data_inicio)
        .all()
    )


def atualizar_indisponibilidade(
    db: Session,
    indisponibilidade_id: int,
    dados: IndisponibilidadeFuncionarioUpdate,
) -> Optional[IndisponibilidadeFuncionario]:
    indisponibilidade = (
        db.query(IndisponibilidadeFuncionario)
        .filter(IndisponibilidadeFuncionario.id == indisponibilidade_id)
        .first()
    )
    if not indisponibilidade:
        return None

    for campo, valor in dados.dict(exclude_unset=True).items():
        setattr(indisponibilidade, campo, valor)

    db.commit()
    db.refresh(indisponibilidade)
    return indisponibilidade


def remover_indisponibilidade(db: Session, indisponibilidade_id: int) -> bool:
    indisponibilidade = (
        db.query(IndisponibilidadeFuncionario)
        .filter(IndisponibilidadeFuncionario.id == indisponibilidade_id)
        .first()
    )
    if not indisponibilidade:
        return False

    db.delete(indisponibilidade)
    db.commit()
    return True

from datetime import date
from typing import Iterable, Optional

from sqlalchemy.orm import Session

from geo_rota.models import DisponibilidadeVeiculo, Veiculo
from geo_rota.schemas import (
    DisponibilidadeVeiculoCreate,
    DisponibilidadeVeiculoUpdate,
    VeiculoCreate,
    VeiculoUpdate,
)


def criar_veiculo(db: Session, dados: VeiculoCreate) -> Veiculo:
    veiculo = Veiculo(**dados.dict())
    db.add(veiculo)
    db.commit()
    db.refresh(veiculo)
    return veiculo


def listar_veiculos(db: Session, empresa_id: Optional[int] = None, apenas_ativos: bool = True) -> Iterable[Veiculo]:
    consulta = db.query(Veiculo)
    if empresa_id is not None:
        consulta = consulta.filter(Veiculo.empresa_id == empresa_id)
    if apenas_ativos:
        consulta = consulta.filter(Veiculo.ativo.is_(True))
    return consulta.order_by(Veiculo.placa).all()


def obter_veiculo(db: Session, veiculo_id: int) -> Optional[Veiculo]:
    return db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()


def atualizar_veiculo(db: Session, veiculo_id: int, dados: VeiculoUpdate) -> Optional[Veiculo]:
    veiculo = obter_veiculo(db, veiculo_id)
    if not veiculo:
        return None

    for campo, valor in dados.dict(exclude_unset=True).items():
        setattr(veiculo, campo, valor)

    db.commit()
    db.refresh(veiculo)
    return veiculo


def remover_veiculo(db: Session, veiculo_id: int) -> bool:
    veiculo = obter_veiculo(db, veiculo_id)
    if not veiculo:
        return False

    db.delete(veiculo)
    db.commit()
    return True


def cadastrar_disponibilidade(db: Session, dados: DisponibilidadeVeiculoCreate) -> DisponibilidadeVeiculo:
    disponibilidade = DisponibilidadeVeiculo(**dados.dict())
    db.add(disponibilidade)
    db.commit()
    db.refresh(disponibilidade)
    return disponibilidade


def listar_disponibilidades(
    db: Session,
    veiculo_id: Optional[int] = None,
    data_referencia: Optional[date] = None,
) -> Iterable[DisponibilidadeVeiculo]:
    consulta = db.query(DisponibilidadeVeiculo)
    if veiculo_id is not None:
        consulta = consulta.filter(DisponibilidadeVeiculo.veiculo_id == veiculo_id)
    if data_referencia is not None:
        consulta = consulta.filter(
            DisponibilidadeVeiculo.inicio_periodo <= data_referencia,
            DisponibilidadeVeiculo.fim_periodo >= data_referencia,
        )
    return consulta.order_by(DisponibilidadeVeiculo.inicio_periodo).all()


def atualizar_disponibilidade(
    db: Session,
    disponibilidade_id: int,
    dados: DisponibilidadeVeiculoUpdate,
) -> Optional[DisponibilidadeVeiculo]:
    disponibilidade = (
        db.query(DisponibilidadeVeiculo).filter(DisponibilidadeVeiculo.id == disponibilidade_id).first()
    )
    if not disponibilidade:
        return None

    for campo, valor in dados.dict(exclude_unset=True).items():
        setattr(disponibilidade, campo, valor)

    db.commit()
    db.refresh(disponibilidade)
    return disponibilidade


def remover_disponibilidade(db: Session, disponibilidade_id: int) -> bool:
    disponibilidade = (
        db.query(DisponibilidadeVeiculo).filter(DisponibilidadeVeiculo.id == disponibilidade_id).first()
    )
    if not disponibilidade:
        return False

    db.delete(disponibilidade)
    db.commit()
    return True

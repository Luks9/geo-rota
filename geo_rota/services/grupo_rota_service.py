from typing import Iterable, Optional

from sqlalchemy.orm import Session

from geo_rota.models import FuncionarioGrupoRota, GrupoRota
from geo_rota.schemas import (
    FuncionarioGrupoRotaCreate,
    GrupoRotaCreate,
    GrupoRotaUpdate,
)


def criar_grupo_rota(db: Session, dados: GrupoRotaCreate) -> GrupoRota:
    grupo = GrupoRota(**dados.dict())
    db.add(grupo)
    db.commit()
    db.refresh(grupo)
    return grupo


def listar_grupos_rota(db: Session, empresa_id: Optional[int] = None) -> Iterable[GrupoRota]:
    consulta = db.query(GrupoRota)
    if empresa_id is not None:
        consulta = consulta.filter(GrupoRota.empresa_id == empresa_id)
    return consulta.order_by(GrupoRota.nome).all()


def obter_grupo_rota(db: Session, grupo_id: int) -> Optional[GrupoRota]:
    return db.query(GrupoRota).filter(GrupoRota.id == grupo_id).first()


def atualizar_grupo_rota(db: Session, grupo_id: int, dados: GrupoRotaUpdate) -> Optional[GrupoRota]:
    grupo = obter_grupo_rota(db, grupo_id)
    if not grupo:
        return None

    for campo, valor in dados.dict(exclude_unset=True).items():
        setattr(grupo, campo, valor)

    db.commit()
    db.refresh(grupo)
    return grupo


def remover_grupo_rota(db: Session, grupo_id: int) -> bool:
    grupo = obter_grupo_rota(db, grupo_id)
    if not grupo:
        return False

    db.delete(grupo)
    db.commit()
    return True


def vincular_funcionario_grupo(db: Session, dados: FuncionarioGrupoRotaCreate) -> FuncionarioGrupoRota:
    vinculo = FuncionarioGrupoRota(**dados.dict())
    db.add(vinculo)
    db.commit()
    db.refresh(vinculo)
    return vinculo


def remover_vinculo_funcionario_grupo(db: Session, vinculo_id: int) -> bool:
    vinculo = db.query(FuncionarioGrupoRota).filter(FuncionarioGrupoRota.id == vinculo_id).first()
    if not vinculo:
        return False

    db.delete(vinculo)
    db.commit()
    return True

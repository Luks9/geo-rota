from typing import Iterable, Optional

from sqlalchemy.orm import Session

from geo_rota.models import Empresa
from geo_rota.schemas import EmpresaCreate, EmpresaUpdate


def criar_empresa(db: Session, dados: EmpresaCreate) -> Empresa:
    empresa = Empresa(**dados.dict())
    db.add(empresa)
    db.commit()
    db.refresh(empresa)
    return empresa


def listar_empresas(db: Session) -> Iterable[Empresa]:
    return db.query(Empresa).order_by(Empresa.nome).all()


def obter_empresa(db: Session, empresa_id: int) -> Optional[Empresa]:
    return db.query(Empresa).filter(Empresa.id == empresa_id).first()


def atualizar_empresa(db: Session, empresa_id: int, dados: EmpresaUpdate) -> Optional[Empresa]:
    empresa = obter_empresa(db, empresa_id)
    if not empresa:
        return None

    for campo, valor in dados.dict(exclude_unset=True).items():
        setattr(empresa, campo, valor)

    db.commit()
    db.refresh(empresa)
    return empresa


def remover_empresa(db: Session, empresa_id: int) -> bool:
    empresa = obter_empresa(db, empresa_id)
    if not empresa:
        return False

    db.delete(empresa)
    db.commit()
    return True

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from geo_rota.core.auth import get_current_active_user, require_admin
from geo_rota.core.database import get_db
from geo_rota.models.user import Usuario
from geo_rota.schemas import EmpresaCreate, EmpresaRead, EmpresaUpdate
from geo_rota.services import (
    atualizar_empresa,
    criar_empresa,
    listar_empresas,
    obter_empresa,
    remover_empresa,
)

router = APIRouter(prefix="/empresas", tags=["Empresas"], dependencies=[Depends(get_current_active_user)])


@router.post("/", response_model=EmpresaRead, status_code=status.HTTP_201_CREATED)
def criar(
    dados: EmpresaCreate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> EmpresaRead:
    return criar_empresa(db, dados)


@router.get("/", response_model=List[EmpresaRead])
def listar(db: Session = Depends(get_db)) -> List[EmpresaRead]:
    return list(listar_empresas(db))


@router.get("/{empresa_id}", response_model=EmpresaRead)
def obter(empresa_id: int, db: Session = Depends(get_db)) -> EmpresaRead:
    empresa = obter_empresa(db, empresa_id)
    if not empresa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa não encontrada")
    return empresa


@router.put("/{empresa_id}", response_model=EmpresaRead)
def atualizar(
    empresa_id: int,
    dados: EmpresaUpdate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> EmpresaRead:
    empresa = atualizar_empresa(db, empresa_id, dados)
    if not empresa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa não encontrada")
    return empresa


@router.delete("/{empresa_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover(
    empresa_id: int,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    removido = remover_empresa(db, empresa_id)
    if not removido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa não encontrada")

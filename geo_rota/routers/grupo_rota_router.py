from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from geo_rota.core.auth import get_current_active_user, require_admin
from geo_rota.core.database import get_db
from geo_rota.models.user import Usuario
from geo_rota.schemas import (
    FuncionarioGrupoRotaCreate,
    FuncionarioGrupoRotaRead,
    GrupoRotaCreate,
    GrupoRotaRead,
    GrupoRotaUpdate,
)
from geo_rota.services import (
    atualizar_grupo_rota,
    criar_grupo_rota,
    listar_grupos_rota,
    obter_grupo_rota,
    remover_grupo_rota,
    remover_vinculo_funcionario_grupo,
    vincular_funcionario_grupo,
)

router = APIRouter(
    prefix="/grupos-rota",
    tags=["Grupos de Rota"],
    dependencies=[Depends(get_current_active_user)],
)


@router.post("/", response_model=GrupoRotaRead, status_code=status.HTTP_201_CREATED)
def criar(
    dados: GrupoRotaCreate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> GrupoRotaRead:
    return criar_grupo_rota(db, dados)


@router.get("/", response_model=List[GrupoRotaRead])
def listar(
    empresa_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
) -> List[GrupoRotaRead]:
    return list(listar_grupos_rota(db, empresa_id=empresa_id))


@router.get("/{grupo_id}", response_model=GrupoRotaRead)
def obter(grupo_id: int, db: Session = Depends(get_db)) -> GrupoRotaRead:
    grupo = obter_grupo_rota(db, grupo_id)
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo de rota não encontrado")
    return grupo


@router.put("/{grupo_id}", response_model=GrupoRotaRead)
def atualizar(
    grupo_id: int,
    dados: GrupoRotaUpdate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> GrupoRotaRead:
    grupo = atualizar_grupo_rota(db, grupo_id, dados)
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo de rota não encontrado")
    return grupo


@router.delete("/{grupo_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover(
    grupo_id: int,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    removido = remover_grupo_rota(db, grupo_id)
    if not removido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo de rota não encontrado")


@router.post(
    "/{grupo_id}/funcionarios",
    response_model=FuncionarioGrupoRotaRead,
    status_code=status.HTTP_201_CREATED,
)
def vincular_funcionario(
    grupo_id: int,
    payload: FuncionarioGrupoRotaCreate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> FuncionarioGrupoRotaRead:
    dados = payload.dict()
    dados["grupo_rota_id"] = grupo_id
    return vincular_funcionario_grupo(db, FuncionarioGrupoRotaCreate(**dados))


@router.delete("/vinculos/{vinculo_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_vinculo(
    vinculo_id: int,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    removido = remover_vinculo_funcionario_grupo(db, vinculo_id)
    if not removido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vínculo não encontrado")

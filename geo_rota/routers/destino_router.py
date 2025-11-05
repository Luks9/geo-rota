from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from geo_rota.core.auth import get_current_active_user, require_admin
from geo_rota.core.database import get_db
from geo_rota.models.user import Usuario
from geo_rota.schemas import DestinoRotaCreate, DestinoRotaRead, DestinoRotaUpdate
from geo_rota.services import atualizar_destino, criar_destino, listar_destinos, obter_destino, remover_destino

router = APIRouter(
    prefix="/destinos",
    tags=["Destinos"],
    dependencies=[Depends(get_current_active_user)],
)


@router.post("/", response_model=DestinoRotaRead, status_code=status.HTTP_201_CREATED)
def criar(
    dados: DestinoRotaCreate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DestinoRotaRead:
    try:
        return criar_destino(db, dados)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/", response_model=List[DestinoRotaRead])
def listar(
    empresa_id: Optional[int] = Query(default=None),
    apenas_ativos: bool = Query(default=True),
    db: Session = Depends(get_db),
) -> List[DestinoRotaRead]:
    return list(listar_destinos(db, empresa_id=empresa_id, apenas_ativos=apenas_ativos))


@router.get("/{destino_id}", response_model=DestinoRotaRead)
def obter(destino_id: int, db: Session = Depends(get_db)) -> DestinoRotaRead:
    destino = obter_destino(db, destino_id)
    if not destino:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destino não encontrado")
    return destino


@router.put("/{destino_id}", response_model=DestinoRotaRead)
def atualizar(
    destino_id: int,
    dados: DestinoRotaUpdate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DestinoRotaRead:
    try:
        destino = atualizar_destino(db, destino_id, dados)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not destino:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destino não encontrado")
    return destino


@router.delete("/{destino_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover(
    destino_id: int,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    removido = remover_destino(db, destino_id)
    if not removido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destino não encontrado")

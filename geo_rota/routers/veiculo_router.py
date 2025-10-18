from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from geo_rota.core.auth import get_current_active_user, require_admin
from geo_rota.core.database import get_db
from geo_rota.models.user import Usuario
from geo_rota.schemas import (
    DisponibilidadeVeiculoCreate,
    DisponibilidadeVeiculoRead,
    DisponibilidadeVeiculoUpdate,
    VeiculoCreate,
    VeiculoRead,
    VeiculoUpdate,
)
from geo_rota.services import (
    atualizar_disponibilidade,
    atualizar_veiculo,
    cadastrar_disponibilidade,
    criar_veiculo,
    listar_disponibilidades,
    listar_veiculos,
    obter_veiculo,
    remover_disponibilidade,
    remover_veiculo,
)

router = APIRouter(
    prefix="/veiculos",
    tags=["Veiculos"],
    dependencies=[Depends(get_current_active_user)],
)


@router.post("/", response_model=VeiculoRead, status_code=status.HTTP_201_CREATED)
def criar(
    dados: VeiculoCreate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> VeiculoRead:
    return criar_veiculo(db, dados)


@router.get("/", response_model=List[VeiculoRead])
def listar(
    empresa_id: Optional[int] = Query(default=None),
    apenas_ativos: bool = Query(default=True),
    db: Session = Depends(get_db),
) -> List[VeiculoRead]:
    return list(listar_veiculos(db, empresa_id=empresa_id, apenas_ativos=apenas_ativos))


@router.get("/{veiculo_id}", response_model=VeiculoRead)
def obter(veiculo_id: int, db: Session = Depends(get_db)) -> VeiculoRead:
    veiculo = obter_veiculo(db, veiculo_id)
    if not veiculo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Veículo não encontrado")
    return veiculo


@router.put("/{veiculo_id}", response_model=VeiculoRead)
def atualizar(
    veiculo_id: int,
    dados: VeiculoUpdate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> VeiculoRead:
    veiculo = atualizar_veiculo(db, veiculo_id, dados)
    if not veiculo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Veículo não encontrado")
    return veiculo


@router.delete("/{veiculo_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover(
    veiculo_id: int,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    removido = remover_veiculo(db, veiculo_id)
    if not removido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Veículo não encontrado")


@router.post(
    "/{veiculo_id}/disponibilidades",
    response_model=DisponibilidadeVeiculoRead,
    status_code=status.HTTP_201_CREATED,
)
def cadastrar_disponibilidade_veiculo(
    veiculo_id: int,
    payload: DisponibilidadeVeiculoCreate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DisponibilidadeVeiculoRead:
    dados = payload.dict()
    dados["veiculo_id"] = veiculo_id
    return cadastrar_disponibilidade(db, DisponibilidadeVeiculoCreate(**dados))


@router.get("/{veiculo_id}/disponibilidades", response_model=List[DisponibilidadeVeiculoRead])
def listar_disponibilidades_veiculo(
    veiculo_id: int,
    data_referencia: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
) -> List[DisponibilidadeVeiculoRead]:
    return list(listar_disponibilidades(db, veiculo_id=veiculo_id, data_referencia=data_referencia))


@router.put(
    "/disponibilidades/{disponibilidade_id}",
    response_model=DisponibilidadeVeiculoRead,
)
def atualizar_disponibilidade_veiculo(
    disponibilidade_id: int,
    dados: DisponibilidadeVeiculoUpdate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DisponibilidadeVeiculoRead:
    disponibilidade = atualizar_disponibilidade(db, disponibilidade_id, dados)
    if not disponibilidade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disponibilidade não encontrada")
    return disponibilidade


@router.delete("/disponibilidades/{disponibilidade_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_disponibilidade_veiculo(
    disponibilidade_id: int,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    removido = remover_disponibilidade(db, disponibilidade_id)
    if not removido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disponibilidade não encontrada")

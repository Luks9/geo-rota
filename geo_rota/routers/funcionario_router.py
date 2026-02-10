from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from geo_rota.core.auth import get_current_active_user, require_admin
from geo_rota.core.database import get_db
from geo_rota.models.user import Usuario
from geo_rota.schemas import (
    EscalaTrabalhoCreate,
    EscalaTrabalhoRead,
    EscalaTrabalhoUpdate,
    FuncionarioComDetalhes,
    FuncionarioCreatePayload,
    FuncionarioRead,
    FuncionarioUpdatePayload,
    IndisponibilidadeFuncionarioCreate,
    IndisponibilidadeFuncionarioRead,
    IndisponibilidadeFuncionarioUpdate,
)
from geo_rota.services import (
    adicionar_escala_trabalho,
    atualizar_indisponibilidade,
    atualizar_escala_trabalho,
    atualizar_funcionario,
    cadastrar_indisponibilidade,
    criar_funcionario,
    inativar_funcionario,
    listar_indisponibilidades,
    listar_funcionarios,
    obter_funcionario,
    remover_indisponibilidade,
    remover_escala_trabalho,
)

router = APIRouter(
    prefix="/funcionarios",
    tags=["Funcionarios"],
    dependencies=[Depends(get_current_active_user)],
)


@router.post("/", response_model=FuncionarioComDetalhes, status_code=status.HTTP_201_CREATED)
def criar(
    dados: FuncionarioCreatePayload,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> FuncionarioComDetalhes:
    try:
        return criar_funcionario(db, dados)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/", response_model=List[FuncionarioRead])
def listar(
    empresa_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
) -> List[FuncionarioRead]:
    return list(listar_funcionarios(db, empresa_id=empresa_id))


@router.get("/{funcionario_id}", response_model=FuncionarioComDetalhes)
def obter(funcionario_id: int, db: Session = Depends(get_db)) -> FuncionarioComDetalhes:
    funcionario = obter_funcionario(db, funcionario_id)
    if not funcionario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funcionário não encontrado")
    return funcionario


@router.put("/{funcionario_id}", response_model=FuncionarioComDetalhes)
def atualizar(
    funcionario_id: int,
    dados: FuncionarioUpdatePayload,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> FuncionarioComDetalhes:
    try:
        funcionario = atualizar_funcionario(db, funcionario_id, dados)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not funcionario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funcionário não encontrado")
    return funcionario


@router.delete("/{funcionario_id}", status_code=status.HTTP_204_NO_CONTENT)
def desativar(
    funcionario_id: int,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    sucesso = inativar_funcionario(db, funcionario_id)
    if not sucesso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funcionário não encontrado")


@router.post(
    "/{funcionario_id}/escalas",
    response_model=EscalaTrabalhoRead,
    status_code=status.HTTP_201_CREATED,
)
def criar_escala(
    funcionario_id: int,
    payload: EscalaTrabalhoCreate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> EscalaTrabalhoRead:
    dados = payload.dict()
    dados["funcionario_id"] = funcionario_id
    return adicionar_escala_trabalho(db, EscalaTrabalhoCreate(**dados))


@router.put("/escalas/{escala_id}", response_model=EscalaTrabalhoRead)
def atualizar_escala(
    escala_id: int,
    dados: EscalaTrabalhoUpdate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> EscalaTrabalhoRead:
    escala = atualizar_escala_trabalho(db, escala_id, dados)
    if not escala:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escala não encontrada")
    return escala


@router.delete("/escalas/{escala_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_escala(
    escala_id: int,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    removido = remover_escala_trabalho(db, escala_id)
    if not removido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escala não encontrada")


@router.get(
    "/{funcionario_id}/indisponibilidades",
    response_model=List[IndisponibilidadeFuncionarioRead],
)
def listar_indisponibilidades_funcionario(
    funcionario_id: int,
    db: Session = Depends(get_db),
) -> List[IndisponibilidadeFuncionarioRead]:
    return list(listar_indisponibilidades(db, funcionario_id=funcionario_id))


@router.post(
    "/{funcionario_id}/indisponibilidades",
    response_model=IndisponibilidadeFuncionarioRead,
    status_code=status.HTTP_201_CREATED,
)
def criar_indisponibilidade(
    funcionario_id: int,
    payload: IndisponibilidadeFuncionarioCreate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> IndisponibilidadeFuncionarioRead:
    dados = payload.dict()
    dados["funcionario_id"] = funcionario_id
    return cadastrar_indisponibilidade(db, IndisponibilidadeFuncionarioCreate(**dados))


@router.put(
    "/indisponibilidades/{indisponibilidade_id}",
    response_model=IndisponibilidadeFuncionarioRead,
)
def atualizar_indisponibilidade_funcionario(
    indisponibilidade_id: int,
    dados: IndisponibilidadeFuncionarioUpdate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> IndisponibilidadeFuncionarioRead:
    indisponibilidade = atualizar_indisponibilidade(db, indisponibilidade_id, dados)
    if not indisponibilidade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indisponibilidade não encontrada")
    return indisponibilidade


@router.delete("/indisponibilidades/{indisponibilidade_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_indisponibilidade_funcionario(
    indisponibilidade_id: int,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    removido = remover_indisponibilidade(db, indisponibilidade_id)
    if not removido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indisponibilidade não encontrada")

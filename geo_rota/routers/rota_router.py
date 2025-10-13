from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from geo_rota.core.database import get_db
from geo_rota.schemas import (
    AtribuicaoRotaCreate,
    AtribuicaoRotaRead,
    FuncionarioPendenteRotaCreate,
    FuncionarioPendenteRotaRead,
    LogAdministrativoRead,
    LogErroRotaRead,
    LogGeracaoRotaRead,
    RequisicaoGerarRota,
    RotaCreate,
    RotaRead,
    RotaUpdate,
)
from geo_rota.services import (
    atribuir_funcionario,
    atualizar_rota,
    criar_rota,
    gerar_rota_automatica,
    listar_rotas,
    obter_rota,
    registrar_funcionario_pendente,
    registrar_log_administrativo,
    registrar_log_erro,
    registrar_log_geracao,
    remover_atribuicao,
    remover_funcionario_pendente,
    remover_rota,
)
from geo_rota.services.roteirizacao_service import CapacidadeVeiculoInsuficienteError


class LogGeracaoCreate(BaseModel):
    quantidade_funcionarios: int
    veiculo_id: Optional[int] = None
    motorista_id: Optional[int] = None
    observacoes: Optional[str] = None


class LogAdministrativoCreate(BaseModel):
    responsavel: str
    acao: str
    detalhes: Optional[str] = None


class LogErroCreate(BaseModel):
    contexto: str
    mensagem: str
    rota_id: Optional[int] = None
    detalhes: Optional[str] = None


router = APIRouter(prefix="/rotas", tags=["Rotas"])


@router.post("/", response_model=RotaRead, status_code=status.HTTP_201_CREATED)
def criar(dados: RotaCreate, db: Session = Depends(get_db)) -> RotaRead:
    return criar_rota(db, dados)


@router.post("/gerar", response_model=RotaRead, status_code=status.HTTP_201_CREATED)
def gerar_rota(request: RequisicaoGerarRota, db: Session = Depends(get_db)) -> RotaRead:
    try:
        return gerar_rota_automatica(db, request)
    except CapacidadeVeiculoInsuficienteError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"mensagem": str(exc), "sugestoes": exc.sugestoes},
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/", response_model=List[RotaRead])
def listar(
    empresa_id: Optional[int] = Query(default=None),
    data_referencia: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
) -> List[RotaRead]:
    return list(listar_rotas(db, empresa_id=empresa_id, data_referencia=data_referencia))


@router.get("/{rota_id}", response_model=RotaRead)
def obter(rota_id: int, db: Session = Depends(get_db)) -> RotaRead:
    rota = obter_rota(db, rota_id)
    if not rota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rota não encontrada")
    return rota


@router.put("/{rota_id}", response_model=RotaRead)
def atualizar(rota_id: int, dados: RotaUpdate, db: Session = Depends(get_db)) -> RotaRead:
    rota = atualizar_rota(db, rota_id, dados)
    if not rota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rota não encontrada")
    return rota


@router.delete("/{rota_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover(rota_id: int, db: Session = Depends(get_db)) -> None:
    removida = remover_rota(db, rota_id)
    if not removida:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rota não encontrada")


@router.post(
    "/{rota_id}/atribuicoes",
    response_model=AtribuicaoRotaRead,
    status_code=status.HTTP_201_CREATED,
)
def atribuir(
    rota_id: int,
    payload: AtribuicaoRotaCreate,
    db: Session = Depends(get_db),
) -> AtribuicaoRotaRead:
    dados = payload.dict()
    dados["rota_id"] = rota_id
    return atribuir_funcionario(db, AtribuicaoRotaCreate(**dados))


@router.delete("/atribuicoes/{atribuicao_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_atribuicao_rota(atribuicao_id: int, db: Session = Depends(get_db)) -> None:
    removida = remover_atribuicao(db, atribuicao_id)
    if not removida:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atribuição não encontrada")


@router.post(
    "/{rota_id}/pendencias",
    response_model=FuncionarioPendenteRotaRead,
    status_code=status.HTTP_201_CREATED,
)
def registrar_pendente(
    rota_id: int,
    payload: FuncionarioPendenteRotaCreate,
    db: Session = Depends(get_db),
) -> FuncionarioPendenteRotaRead:
    dados = payload.dict()
    dados["rota_id"] = rota_id
    return registrar_funcionario_pendente(db, FuncionarioPendenteRotaCreate(**dados))


@router.delete("/pendencias/{pendente_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_pendente(pendente_id: int, db: Session = Depends(get_db)) -> None:
    removido = remover_funcionario_pendente(db, pendente_id)
    if not removido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pendência não encontrada")


@router.post(
    "/{rota_id}/logs/geracao",
    response_model=LogGeracaoRotaRead,
    status_code=status.HTTP_201_CREATED,
)
def registrar_log_de_geracao(
    rota_id: int,
    payload: LogGeracaoCreate,
    db: Session = Depends(get_db),
) -> LogGeracaoRotaRead:
    return registrar_log_geracao(
        db,
        rota_id=rota_id,
        quantidade_funcionarios=payload.quantidade_funcionarios,
        veiculo_id=payload.veiculo_id,
        motorista_id=payload.motorista_id,
        observacoes=payload.observacoes,
    )


@router.post(
    "/{rota_id}/logs/administrativos",
    response_model=LogAdministrativoRead,
    status_code=status.HTTP_201_CREATED,
)
def registrar_log_admin(
    rota_id: int,
    payload: LogAdministrativoCreate,
    db: Session = Depends(get_db),
) -> LogAdministrativoRead:
    return registrar_log_administrativo(
        db,
        rota_id=rota_id,
        responsavel=payload.responsavel,
        acao=payload.acao,
        detalhes=payload.detalhes,
    )


@router.post(
    "/logs/erros",
    response_model=LogErroRotaRead,
    status_code=status.HTTP_201_CREATED,
)
def registrar_log_erro_rota(payload: LogErroCreate, db: Session = Depends(get_db)) -> LogErroRotaRead:
    return registrar_log_erro(
        db,
        contexto=payload.contexto,
        mensagem=payload.mensagem,
        rota_id=payload.rota_id,
        detalhes=payload.detalhes,
    )

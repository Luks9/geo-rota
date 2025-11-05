from datetime import date
from typing import Iterable, Optional

from sqlalchemy.orm import Session

from geo_rota.models import (
    AtribuicaoRota,
    Funcionario,
    FuncionarioPendenteRota,
    LogAdministrativo,
    LogErroRota,
    LogGeracaoRota,
    Rota,
)
from geo_rota.schemas import (
    AtribuicaoRotaCreate,
    FuncionarioPendenteRotaCreate,
    RotaCreate,
    RotaUpdate,
)
from geo_rota.utils import GeocodeError, geocode_address


def _montar_endereco_funcionario(funcionario: Funcionario) -> str:
    partes = [
        funcionario.logradouro,
        funcionario.numero,
        funcionario.complemento,
        funcionario.bairro,
        funcionario.cidade,
        funcionario.estado,
        funcionario.cep,
        "Brasil",
    ]
    return ", ".join(filter(None, partes))


def _obter_coordenadas_funcionario(funcionario: Funcionario) -> tuple[float, float] | None:
    endereco = _montar_endereco_funcionario(funcionario)
    try:
        return geocode_address(endereco)
    except GeocodeError:
        return None


def criar_rota(db: Session, dados: RotaCreate) -> Rota:
    rota = Rota(**dados.dict())
    db.add(rota)
    db.commit()
    db.refresh(rota)
    return rota


def listar_rotas(
    db: Session,
    empresa_id: Optional[int] = None,
    data_referencia: Optional[date] = None,
) -> Iterable[Rota]:
    consulta = db.query(Rota)
    if empresa_id is not None:
        consulta = consulta.filter(Rota.empresa_id == empresa_id)
    if data_referencia is not None:
        consulta = consulta.filter(Rota.data_agendada == data_referencia)
    return consulta.order_by(Rota.data_agendada, Rota.turno).all()


def obter_rota(db: Session, rota_id: int) -> Optional[Rota]:
    return db.query(Rota).filter(Rota.id == rota_id).first()


def atualizar_rota(db: Session, rota_id: int, dados: RotaUpdate) -> Optional[Rota]:
    rota = obter_rota(db, rota_id)
    if not rota:
        return None

    for campo, valor in dados.dict(exclude_unset=True).items():
        setattr(rota, campo, valor)

    db.commit()
    db.refresh(rota)
    return rota


def remover_rota(db: Session, rota_id: int) -> bool:
    rota = obter_rota(db, rota_id)
    if not rota:
        return False

    db.delete(rota)
    db.commit()
    return True


def atribuir_funcionario(db: Session, dados: AtribuicaoRotaCreate) -> AtribuicaoRota:
    payload = dados.dict()
    if payload.get("latitude") is None or payload.get("longitude") is None:
        funcionario = db.get(Funcionario, dados.funcionario_id)
        if funcionario:
            coordenadas = _obter_coordenadas_funcionario(funcionario)
            if coordenadas:
                payload["latitude"], payload["longitude"] = coordenadas

    atribuicao = AtribuicaoRota(**payload)
    db.add(atribuicao)
    db.commit()
    db.refresh(atribuicao)
    return atribuicao


def remover_atribuicao(db: Session, atribuicao_id: int) -> bool:
    atribuicao = db.query(AtribuicaoRota).filter(AtribuicaoRota.id == atribuicao_id).first()
    if not atribuicao:
        return False

    db.delete(atribuicao)
    db.commit()
    return True


def registrar_funcionario_pendente(
    db: Session,
    dados: FuncionarioPendenteRotaCreate,
) -> FuncionarioPendenteRota:
    pendente = FuncionarioPendenteRota(**dados.dict())
    db.add(pendente)
    db.commit()
    db.refresh(pendente)
    return pendente


def remover_funcionario_pendente(db: Session, pendente_id: int) -> bool:
    pendente = db.query(FuncionarioPendenteRota).filter(FuncionarioPendenteRota.id == pendente_id).first()
    if not pendente:
        return False

    db.delete(pendente)
    db.commit()
    return True


def registrar_log_geracao(
    db: Session,
    rota_id: int,
    quantidade_funcionarios: int,
    veiculo_id: Optional[int] = None,
    motorista_id: Optional[int] = None,
    observacoes: Optional[str] = None,
) -> LogGeracaoRota:
    log = LogGeracaoRota(
        rota_id=rota_id,
        quantidade_funcionarios=quantidade_funcionarios,
        veiculo_id=veiculo_id,
        motorista_id=motorista_id,
        observacoes=observacoes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def registrar_log_administrativo(
    db: Session,
    rota_id: int,
    responsavel: str,
    acao: str,
    detalhes: Optional[str] = None,
) -> LogAdministrativo:
    log = LogAdministrativo(
        rota_id=rota_id,
        responsavel=responsavel,
        acao=acao,
        detalhes=detalhes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def registrar_log_erro(
    db: Session,
    contexto: str,
    mensagem: str,
    rota_id: Optional[int] = None,
    detalhes: Optional[str] = None,
) -> LogErroRota:
    erro = LogErroRota(
        rota_id=rota_id,
        contexto=contexto,
        mensagem=mensagem,
        detalhes=detalhes,
    )
    db.add(erro)
    db.commit()
    db.refresh(erro)
    return erro

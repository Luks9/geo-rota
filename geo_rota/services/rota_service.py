from datetime import date
from typing import Iterable, Optional, Set

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from geo_rota.models import (
    AtribuicaoRota,
    DestinoRota,
    DisponibilidadeVeiculo,
    Funcionario,
    FuncionarioPendenteRota,
    LogAdministrativo,
    LogErroRota,
    LogGeracaoRota,
    Rota,
    Veiculo,
)
from geo_rota.models.enums import StatusRotaEnum, TurnoTrabalhoEnum
from geo_rota.schemas import (
    AtribuicaoRotaCreate,
    AtualizarDataTurnoRota,
    AtualizarDestinoRota,
    AtualizarFuncionariosRota,
    AtualizarMotoristaRota,
    AtualizarStatusRota,
    AtualizarVeiculoRota,
    FuncionarioPendenteRotaCreate,
    RemanejarFuncionariosPayload,
    RecalcularRotaPayload,
    RotaCreate,
    RotaUpdate,
)
from geo_rota.utils import GeocodeError, geocode_address
from geo_rota.services.roteirizacao_service import recalcular_rota_existente


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


def _registrar_conflito_alocacao(
    db: Session,
    rota: Optional[Rota],
    mensagem: str,
    responsavel: Optional[str],
) -> None:
    registrar_log_erro(
        db,
        contexto="Conflito de alocação",
        mensagem=mensagem,
        rota_id=rota.id if rota else None,
        detalhes=f"Usuário: {responsavel or 'sistema'}",
    )


def _verificar_conflito_funcionario(
    db: Session,
    funcionario_id: int,
    data: date,
    turno: TurnoTrabalhoEnum,
    ignorar_rotas: Optional[Set[int]] = None,
) -> bool:
    filtros = [
        Rota.data_agendada == data,
        Rota.turno == turno,
        Rota.status != StatusRotaEnum.CANCELADA,
    ]
    query = (
        db.query(Rota.id)
        .join(AtribuicaoRota, AtribuicaoRota.rota_id == Rota.id)
        .filter(AtribuicaoRota.funcionario_id == funcionario_id, *filtros)
    )
    if ignorar_rotas:
        query = query.filter(~Rota.id.in_(ignorar_rotas))
    if query.first():
        return True

    query_motorista = db.query(Rota.id).filter(Rota.motorista_id == funcionario_id, *filtros)
    if ignorar_rotas:
        query_motorista = query_motorista.filter(~Rota.id.in_(ignorar_rotas))
    return query_motorista.first() is not None


def _verificar_conflito_veiculo(
    db: Session,
    veiculo_id: int,
    data: date,
    turno: TurnoTrabalhoEnum,
    ignorar_rotas: Optional[Set[int]] = None,
) -> bool:
    query = db.query(Rota.id).filter(
        Rota.veiculo_id == veiculo_id,
        Rota.data_agendada == data,
        Rota.turno == turno,
        Rota.status != StatusRotaEnum.CANCELADA,
    )
    if ignorar_rotas:
        query = query.filter(~Rota.id.in_(ignorar_rotas))
    return query.first() is not None


def _resolver_destino_para_atualizacao(
    db: Session,
    rota: Rota,
    payload: AtualizarDestinoRota,
) -> DestinoRota:
    if payload.destino_id is not None:
        destino = db.get(DestinoRota, payload.destino_id)
        if not destino or destino.empresa_id != rota.empresa_id:
            raise ValueError("Destino informado não pertence à empresa da rota.")
        if destino.latitude is None or destino.longitude is None:
            endereco_destino = ", ".join(
                filter(
                    None,
                    [
                        destino.logradouro,
                        destino.numero,
                        destino.complemento,
                        destino.bairro,
                        f"{destino.cidade} - {destino.estado}",
                        destino.cep,
                        "Brasil",
                    ],
                )
            )
            destino.latitude, destino.longitude = geocode_address(endereco_destino)
        return destino

    campos = [
        payload.destino_nome,
        payload.destino_logradouro,
        payload.destino_numero,
        payload.destino_bairro,
        payload.destino_cidade,
        payload.destino_estado,
        payload.destino_cep,
    ]
    if not all(campos):
        raise ValueError("Informe um destino_id válido ou todos os campos para o novo destino.")

    destino_estado = payload.destino_estado.strip().upper()
    destino_cep = payload.destino_cep.replace(" ", "").strip()
    destino_complemento = payload.destino_complemento.strip() if payload.destino_complemento else None
    endereco_componentes = [
        ", ".join(filter(None, [payload.destino_logradouro.strip(), payload.destino_numero.strip()])),
        destino_complemento,
        payload.destino_bairro.strip(),
        f"{payload.destino_cidade.strip()} - {destino_estado}",
        destino_cep,
        "Brasil",
    ]
    endereco = ", ".join(filter(None, endereco_componentes))
    latitude, longitude = geocode_address(endereco)
    destino = DestinoRota(
        empresa_id=rota.empresa_id,
        nome=payload.destino_nome.strip(),
        logradouro=payload.destino_logradouro.strip(),
        numero=payload.destino_numero.strip(),
        complemento=destino_complemento,
        bairro=payload.destino_bairro.strip(),
        cidade=payload.destino_cidade.strip(),
        estado=destino_estado,
        cep=destino_cep,
        latitude=latitude,
        longitude=longitude,
        ativo=True,
    )
    db.add(destino)
    db.flush()
    return destino


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
    return consulta.order_by(Rota.data_agendada, Rota.turno, Rota.sequencia_planejamento).all()


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


def atribuir_funcionario(
    db: Session,
    dados: AtribuicaoRotaCreate,
    responsavel: Optional[str] = None,
) -> AtribuicaoRota:
    rota = db.get(Rota, dados.rota_id)
    if not rota:
        raise ValueError("Rota não encontrada.")
    ignorar = {rota.id}
    if _verificar_conflito_funcionario(db, dados.funcionario_id, rota.data_agendada, rota.turno, ignorar):
        mensagem = "Funcionário já possui rota no mesmo dia e turno."
        _registrar_conflito_alocacao(db, rota, mensagem, responsavel)
        raise ValueError(mensagem)

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


def atualizar_motorista_rota(
    db: Session,
    rota_id: int,
    payload: AtualizarMotoristaRota,
    responsavel: str,
) -> Rota:
    rota = obter_rota(db, rota_id)
    if not rota:
        raise ValueError("Rota não encontrada.")

    motorista_id = payload.motorista_id
    if motorista_id is not None:
        motorista = db.get(Funcionario, motorista_id)
        if not motorista or motorista.empresa_id != rota.empresa_id:
            raise ValueError("Motorista não pertence à empresa da rota.")
        if not motorista.apto_dirigir or not motorista.possui_cnh:
            raise ValueError("Funcionário selecionado não está habilitado como motorista.")
        if _verificar_conflito_funcionario(db, motorista_id, rota.data_agendada, rota.turno, {rota.id}):
            mensagem = "Motorista já está alocado em outra rota neste horário."
            _registrar_conflito_alocacao(db, rota, mensagem, responsavel)
            raise ValueError(mensagem)
        rota.motorista_id = motorista_id
    else:
        rota.motorista_id = None

    db.commit()
    db.refresh(rota)
    registrar_log_administrativo(
        db,
        rota_id=rota.id,
        responsavel=responsavel,
        acao="Atualização de motorista",
        detalhes=f"Motorista definido como {motorista_id or 'automático'}",
    )
    return rota


def atualizar_veiculo_rota(
    db: Session,
    rota_id: int,
    payload: AtualizarVeiculoRota,
    responsavel: str,
) -> Rota:
    rota = obter_rota(db, rota_id)
    if not rota:
        raise ValueError("Rota não encontrada.")

    if payload.veiculo_id is not None:
        veiculo = db.get(Veiculo, payload.veiculo_id)
        if not veiculo or veiculo.empresa_id != rota.empresa_id:
            raise ValueError("Veículo informado não pertence à empresa da rota.")
        if _verificar_conflito_veiculo(db, veiculo.id, rota.data_agendada, rota.turno, {rota.id}):
            mensagem = "Veículo indisponível por conflito de agenda."
            _registrar_conflito_alocacao(db, rota, mensagem, responsavel)
            raise ValueError(mensagem)
        rota.veiculo_id = veiculo.id
    else:
        rota.veiculo_id = None

    if payload.disponibilidade_veiculo_id is not None:
        disponibilidade = db.get(DisponibilidadeVeiculo, payload.disponibilidade_veiculo_id)
        if not disponibilidade or disponibilidade.grupo_rota_id != rota.grupo_rota_id:
            raise ValueError("Disponibilidade informada não está vinculada ao grupo.")
        rota.disponibilidade_veiculo_id = disponibilidade.id
    else:
        rota.disponibilidade_veiculo_id = None

    db.commit()
    db.refresh(rota)
    registrar_log_administrativo(
        db,
        rota_id=rota.id,
        responsavel=responsavel,
        acao="Atualização de veículo",
        detalhes=f"Veículo definido como {rota.veiculo_id or 'automático'}",
    )
    return rota


def atualizar_destino_rota(
    db: Session,
    rota_id: int,
    payload: AtualizarDestinoRota,
    responsavel: str,
) -> Rota:
    rota = obter_rota(db, rota_id)
    if not rota:
        raise ValueError("Rota não encontrada.")
    destino = _resolver_destino_para_atualizacao(db, rota, payload)
    rota.destino_id = destino.id
    db.commit()
    db.refresh(rota)
    registrar_log_administrativo(
        db,
        rota_id=rota.id,
        responsavel=responsavel,
        acao="Atualização de destino",
        detalhes=f"Destino alterado para {destino.nome}",
    )
    return rota


def atualizar_data_turno_rota(
    db: Session,
    rota_id: int,
    payload: AtualizarDataTurnoRota,
    responsavel: str,
) -> Rota:
    rota = obter_rota(db, rota_id)
    if not rota:
        raise ValueError("Rota não encontrada.")

    conflito = (
        db.query(Rota)
        .filter(
            Rota.id != rota.id,
            Rota.grupo_rota_id == rota.grupo_rota_id,
            Rota.data_agendada == payload.data_agendada,
            Rota.turno == payload.turno,
        )
        .first()
    )
    if conflito:
        raise ValueError("Já existe rota para o grupo na data e turno informados.")

    rota.data_agendada = payload.data_agendada
    rota.turno = payload.turno
    db.commit()
    db.refresh(rota)
    registrar_log_administrativo(
        db,
        rota_id=rota.id,
        responsavel=responsavel,
        acao="Atualização de data/turno",
        detalhes=f"Atualizado para {payload.data_agendada} - {payload.turno}",
    )
    return rota


def atualizar_status_rota(
    db: Session,
    rota_id: int,
    payload: AtualizarStatusRota,
    responsavel: str,
) -> Rota:
    rota = obter_rota(db, rota_id)
    if not rota:
        raise ValueError("Rota não encontrada.")
    rota.status = payload.status
    db.commit()
    db.refresh(rota)
    registrar_log_administrativo(
        db,
        rota_id=rota.id,
        responsavel=responsavel,
        acao="Atualização de status",
        detalhes=f"Status alterado para {payload.status}",
    )
    return rota


def atualizar_funcionarios_rota(
    db: Session,
    rota_id: int,
    payload: AtualizarFuncionariosRota,
    responsavel: str,
) -> Rota:
    rota = obter_rota(db, rota_id)
    if not rota:
        raise ValueError("Rota não encontrada.")
    if not payload.atribuicoes:
        raise ValueError("Informe ao menos uma atribuição.")

    funcionarios_ids = [item.funcionario_id for item in payload.atribuicoes]
    funcionarios = (
        db.query(Funcionario)
        .filter(
            Funcionario.id.in_(funcionarios_ids),
            Funcionario.empresa_id == rota.empresa_id,
        )
        .all()
    )
    if len(funcionarios) != len(funcionarios_ids):
        raise ValueError("Nem todos os funcionários informados pertencem à empresa.")
    funcionarios_map = {f.id: f for f in funcionarios}

    ids_vistos: Set[int] = set()
    for item in payload.atribuicoes:
        if item.funcionario_id in ids_vistos:
            raise ValueError("Funcionário informado mais de uma vez na mesma rota.")
        ids_vistos.add(item.funcionario_id)
        if _verificar_conflito_funcionario(db, item.funcionario_id, rota.data_agendada, rota.turno, {rota.id}):
            mensagem = f"Funcionário já possui rota no turno {rota.turno} para esta data."
            _registrar_conflito_alocacao(db, rota, mensagem, responsavel)
            raise ValueError(mensagem)

    db.query(AtribuicaoRota).filter(AtribuicaoRota.rota_id == rota.id).delete()
    db.flush()

    for indice, atribuicao in enumerate(payload.atribuicoes):
        funcionario = funcionarios_map[atribuicao.funcionario_id]
        coordenadas = _obter_coordenadas_funcionario(funcionario)
        nova_atribuicao = AtribuicaoRota(
            rota_id=rota.id,
            funcionario_id=funcionario.id,
            papel=atribuicao.papel,
            ordem_embarque=atribuicao.ordem_embarque if atribuicao.ordem_embarque is not None else indice,
            latitude=coordenadas[0] if coordenadas else None,
            longitude=coordenadas[1] if coordenadas else None,
        )
        db.add(nova_atribuicao)

    db.commit()
    db.refresh(rota)
    registrar_log_administrativo(
        db,
        rota_id=rota.id,
        responsavel=responsavel,
        acao="Atualização de funcionários",
        detalhes=f"{len(payload.atribuicoes)} atribuições atualizadas",
    )
    return rota


def remanejar_funcionarios_entre_rotas(
    db: Session,
    payload: RemanejarFuncionariosPayload,
    responsavel: str,
) -> tuple[Rota, Rota]:
    rota_origem = obter_rota(db, payload.rota_origem_id)
    rota_destino = obter_rota(db, payload.rota_destino_id)
    if not rota_origem or not rota_destino:
        raise ValueError("Rotas informadas não foram encontradas.")
    if rota_origem.data_agendada != rota_destino.data_agendada or rota_origem.turno != rota_destino.turno:
        raise ValueError("Remanejamento permitido apenas para rotas do mesmo dia/turno.")

    atribuicoes = (
        db.query(AtribuicaoRota)
        .filter(
            AtribuicaoRota.rota_id == rota_origem.id,
            AtribuicaoRota.funcionario_id.in_(payload.funcionarios_ids),
        )
        .all()
    )
    if not atribuicoes:
        raise ValueError("Nenhum funcionário localizado para remanejamento.")

    for atribuicao in atribuicoes:
        if _verificar_conflito_funcionario(
            db,
            atribuicao.funcionario_id,
            rota_destino.data_agendada,
            rota_destino.turno,
            {rota_origem.id, rota_destino.id},
        ):
            mensagem = "Funcionário já possui rota no turno selecionado."
            _registrar_conflito_alocacao(db, rota_destino, mensagem, responsavel)
            raise ValueError(mensagem)

    for atribuicao in atribuicoes:
        db.delete(atribuicao)

    destino_ordem_inicial = (
        db.query(func.max(AtribuicaoRota.ordem_embarque))
        .filter(AtribuicaoRota.rota_id == rota_destino.id)
        .scalar()
    ) or 0

    for posicao, atribuicao in enumerate(atribuicoes, start=1):
        nova_ordem = destino_ordem_inicial + posicao
        nova_atribuicao = AtribuicaoRota(
            rota_id=rota_destino.id,
            funcionario_id=atribuicao.funcionario_id,
            papel=atribuicao.papel,
            ordem_embarque=nova_ordem,
            latitude=atribuicao.latitude,
            longitude=atribuicao.longitude,
        )
        db.add(nova_atribuicao)

    db.commit()
    db.refresh(rota_origem)
    db.refresh(rota_destino)
    registrar_log_administrativo(
        db,
        rota_id=rota_origem.id,
        responsavel=responsavel,
        acao="Remanejamento de funcionários",
        detalhes=f"Funcionários movidos para rota #{rota_destino.id}",
    )
    registrar_log_administrativo(
        db,
        rota_id=rota_destino.id,
        responsavel=responsavel,
        acao="Remanejamento de funcionários",
        detalhes=f"Funcionários recebidos da rota #{rota_origem.id}",
    )
    return rota_origem, rota_destino


def recalcular_rota(
    db: Session,
    rota_id: int,
    payload: RecalcularRotaPayload,
    responsavel: str,
) -> Rota:
    rota = recalcular_rota_existente(db, rota_id)
    registrar_log_administrativo(
        db,
        rota_id=rota.id,
        responsavel=responsavel,
        acao="Recalcular rota",
        detalhes=payload.motivo or "Recalculo manual solicitado.",
    )
    return rota

"""
Motor de geração automática de rotas.

Responsável por:
* Selecionar funcionários elegíveis para uma data/turno.
* Escolher motorista e veículo disponíveis (automático ou manual).
* Geocodificar endereços e montar a melhor sequência de embarque.
* Persistir a rota, atribuições, pendências e logs.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Sequence, Tuple

from geopy.exc import GeocoderServiceError
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from sqlalchemy import and_, func
from sqlalchemy.orm import Session, aliased

from geo_rota.models import (
    AtribuicaoRota,
    CacheResultadoVRP,
    DisponibilidadeVeiculo,
    Empresa,
    DestinoRota,
    Funcionario,
    FuncionarioGrupoRota,
    EscalaTrabalho,
    IndisponibilidadeFuncionario,
    FuncionarioPendenteRota,
    GrupoRota,
    LogGeracaoRota,
    Rota,
    Veiculo,
)
from geo_rota.models.enums import (
    CategoriaCustoVeiculo,
    ModoAlgoritmoEnum,
    PapelAtribuicaoRota,
    StatusRotaEnum,
    TipoDisponibilidadeVeiculoEnum,
    TurnoTrabalhoEnum,
)
from geo_rota.schemas.route import RequisicaoGerarRota, RequisicaoGerarRotasVRP
from geo_rota.core.config import settings
from geo_rota.utils import GeocodeError, distance_km, geocode_address
from geo_rota.utils.osrm import OSRMServiceError, montar_matrizes_osrm

# Fator de custo relativo por categoria do veículo (quanto maior, mais caro).
CUSTO_RELATIVO_CATEGORIA: dict[CategoriaCustoVeiculo, float] = {
    CategoriaCustoVeiculo.BAIXO: 1.0,
    CategoriaCustoVeiculo.MEDIO: 1.2,
    CategoriaCustoVeiculo.ALTO: 1.5,
}


# ---------------------------------------------------------------------------
# Funções utilitárias de domínio
# ---------------------------------------------------------------------------


class CapacidadeVeiculoInsuficienteError(ValueError):
    def __init__(self, message: str, sugestoes: Optional[List[dict]] = None) -> None:
        super().__init__(message)
        self.sugestoes = sugestoes or []

def _montar_endereco_completo(funcionario: Funcionario) -> str:
    """Concatena os campos de endereço do funcionário em um formato padrão."""
    partes = [
        funcionario.logradouro,
        funcionario.numero,
        funcionario.complemento,
        funcionario.bairro,
        funcionario.cidade,
        funcionario.estado,
        funcionario.cep,
    ]
    return ", ".join(filter(None, partes))


def _montar_endereco_destino(destino: DestinoRota) -> str:
    partes = [
        destino.logradouro,
        destino.numero,
        destino.complemento,
        destino.bairro,
        f"{destino.cidade} - {destino.estado}",
        destino.cep,
    ]
    return ", ".join(filter(None, partes + ["Brasil"]))


def _montar_endereco_empresa(empresa: Empresa) -> str:
    """Gera o endereço completo utilizado como destino padrão da empresa."""
    partes = [
        empresa.endereco_base,
        empresa.cidade,
        empresa.estado,
        empresa.cep,
    ]
    return ", ".join(filter(None, partes))


def _resolver_destino(
    session: Session,
    empresa: Empresa,
    requisicao: RequisicaoGerarRota,
) -> Tuple[DestinoRota, Tuple[float, float]]:
    destino: DestinoRota | None = None
    destino_coordenadas: Tuple[float, float]
    if requisicao.destino_id is not None:
        destino = session.get(DestinoRota, requisicao.destino_id)
        if not destino or destino.empresa_id != empresa.id:
            raise ValueError("Destino informado é inválido para a empresa selecionada.")
        endereco_destino = _montar_endereco_destino(destino)
        if destino.latitude is not None and destino.longitude is not None:
            destino_coordenadas = (destino.latitude, destino.longitude)
        else:
            try:
                destino_coordenadas = geocode_address(endereco_destino)
            except (GeocodeError, GeocoderServiceError) as exc:
                raise ValueError(f"Falha ao geocodificar o destino selecionado: {exc}") from exc
            destino.latitude, destino.longitude = destino_coordenadas
    else:
        campos_obrigatorios = [
            ("destino_logradouro", requisicao.destino_logradouro),
            ("destino_numero", requisicao.destino_numero),
            ("destino_bairro", requisicao.destino_bairro),
            ("destino_cidade", requisicao.destino_cidade),
            ("destino_estado", requisicao.destino_estado),
            ("destino_cep", requisicao.destino_cep),
        ]
        faltantes = [campo for campo, valor in campos_obrigatorios if not (valor and valor.strip())]
        if faltantes:
            raise ValueError(
                "Informe um destino_id válido ou todos os campos de endereço do destino (logradouro, número, bairro, cidade, estado, CEP)."
            )

        destino_nome = (requisicao.destino_nome or empresa.nome).strip()
        destino_estado = requisicao.destino_estado.strip().upper()
        destino_cep = requisicao.destino_cep.replace(" ", "").strip()
        destino_complemento = requisicao.destino_complemento.strip() if requisicao.destino_complemento else None

        endereco_componentes = [
            ", ".join(filter(None, [requisicao.destino_logradouro.strip(), requisicao.destino_numero.strip()])),
            destino_complemento,
            requisicao.destino_bairro.strip(),
            f"{requisicao.destino_cidade.strip()} - {destino_estado}",
            destino_cep,
            "Brasil",
        ]
        destino_endereco = ", ".join(filter(None, endereco_componentes))

        try:
            destino_coordenadas = geocode_address(destino_endereco)
        except (GeocodeError, GeocoderServiceError) as exc:
            raise ValueError(f"Falha ao geocodificar o destino final: {exc}") from exc

        destino = DestinoRota(
            empresa_id=empresa.id,
            nome=destino_nome,
            logradouro=requisicao.destino_logradouro.strip(),
            numero=requisicao.destino_numero.strip(),
            complemento=destino_complemento,
            bairro=requisicao.destino_bairro.strip(),
            cidade=requisicao.destino_cidade.strip(),
            estado=destino_estado,
            cep=destino_cep,
            latitude=destino_coordenadas[0],
            longitude=destino_coordenadas[1],
            ativo=True,
        )
        session.add(destino)
        session.flush()
    return destino, destino_coordenadas


def _obter_coordenadas_funcionarios(
    funcionarios: Sequence[Funcionario],
) -> Dict[int, Tuple[float, float]]:
    """
    Geocodifica e retorna as coordenadas de cada funcionário disponibilizado.
    """
    coordenadas: Dict[int, Tuple[float, float]] = {}
    for funcionario in funcionarios:
        endereco = _montar_endereco_completo(funcionario)
        try:
            coordenadas[funcionario.id] = geocode_address(endereco)
        except (GeocodeError, GeocoderServiceError) as exc:
            nome = (funcionario.nome_completo or "").strip() or f"ID {funcionario.id}"
            raise GeocodeError(f"Falha ao geocodificar o endereço de {nome}: {exc}") from exc
    return coordenadas


def _dia_semana(data_referencia: date) -> int:
    """Retorna o índice do dia da semana compatível com os cadastros (0=segunda)."""
    return data_referencia.weekday()


def _filtrar_funcionarios_disponiveis(
    session: Session,
    grupo: GrupoRota,
    data_agendada: date,
    turno: TurnoTrabalhoEnum,
) -> List[Funcionario]:
    """
    Busca funcionários ativos vinculados ao grupo e disponíveis no dia/turno informados.
    """
    dia = _dia_semana(data_agendada)
    dias_programados = grupo.dias_semana_padrao or []
    if dias_programados and dia not in dias_programados:
        return []
    escalas = aliased(EscalaTrabalho)
    indisponibilidade = aliased(IndisponibilidadeFuncionario)
    query = (
        session.query(Funcionario)
        .join(
            FuncionarioGrupoRota,
            and_(
                FuncionarioGrupoRota.funcionario_id == Funcionario.id,
                FuncionarioGrupoRota.grupo_rota_id == grupo.id,
            ),
        )
        .join(
            escalas,
            and_(
                escalas.funcionario_id == Funcionario.id,
                escalas.dia_semana == dia,
                escalas.turno == turno,
            ),
        )
        .outerjoin(
            indisponibilidade,
            and_(
                indisponibilidade.funcionario_id == Funcionario.id,
                indisponibilidade.data_inicio <= data_agendada,
                indisponibilidade.data_fim >= data_agendada,
            ),
        )
        .filter(
            Funcionario.ativo.is_(True),
            escalas.disponivel.is_(True),
            indisponibilidade.id.is_(None),
        )
        .distinct()
    )
    funcionarios_ocupados_subq = (
        session.query(AtribuicaoRota.funcionario_id)
        .join(Rota, AtribuicaoRota.rota_id == Rota.id)
        .filter(
            Rota.data_agendada == data_agendada,
            Rota.turno == turno,
        )
    )
    query = query.filter(~Funcionario.id.in_(funcionarios_ocupados_subq.subquery()))
    return list(query.all())


def _selecionar_motorista(
    funcionarios: Sequence[Funcionario],
    motorista_id: Optional[int],
    coordenadas: Optional[Dict[int, Tuple[float, float]]] = None,
    destino_coordenadas: Optional[Tuple[float, float]] = None,
) -> Funcionario:
    """
    Retorna o motorista informado ou escolhe automaticamente o motorista apto com menor estimativa de trajeto.
    """
    if motorista_id is not None:
        for funcionario in funcionarios:
            if funcionario.id == motorista_id and funcionario.apto_dirigir and funcionario.possui_cnh:
                return funcionario
        raise ValueError("Motorista informado não está disponível ou não possui CNH válida.")

    candidatos = [f for f in funcionarios if f.apto_dirigir and f.possui_cnh]
    if not candidatos:
        raise ValueError("Nenhum motorista habilitado disponível para o grupo/data/turno informados.")

    if coordenadas is None or destino_coordenadas is None:
        return candidatos[0]

    melhor_motorista = candidatos[0]
    melhor_distancia: Optional[float] = None

    for candidato in candidatos:
        coord_motorista = coordenadas.get(candidato.id)
        if coord_motorista is None:
            continue

        coords_trajeto: List[Tuple[float, float]] = [coord_motorista]
        for passageiro in funcionarios:
            if passageiro.id == candidato.id:
                continue
            coord_passageiro = coordenadas.get(passageiro.id)
            if coord_passageiro is None:
                coords_trajeto = []
                break
            coords_trajeto.append(coord_passageiro)

        if not coords_trajeto:
            continue

        coords_trajeto.append(destino_coordenadas)
        indice_destino = len(coords_trajeto) - 1
        if indice_destino <= 0:
            continue

        try:
            ordem_passageiros = _resolver_ordem_embarque(coords_trajeto, indice_destino)
            distancia_estimativa = _calcular_distancia_total(coords_trajeto, ordem_passageiros, indice_destino)
        except Exception:  # fallback em caso de falha na otimização
            distancia_estimativa = None

        if distancia_estimativa is None:
            continue

        if melhor_distancia is None or distancia_estimativa < melhor_distancia:
            melhor_distancia = distancia_estimativa
            melhor_motorista = candidato

    if melhor_distancia is None:
        return candidatos[0]

    return melhor_motorista


def _parse_dias_semana(dias: Optional[str]) -> set[int]:
    if not dias:
        return set()
    return {int(dia.strip()) for dia in dias.split(",") if dia.strip().isdigit()}


def _selecionar_disponibilidade_veiculo(
    session: Session,
    grupo: GrupoRota,
    data_agendada: date,
    capacidade_minima: int,
    veiculo_id: Optional[int],
) -> Tuple[Veiculo, DisponibilidadeVeiculo]:
    """
    Encontra um veículo com disponibilidade compatível. Pode respeitar escolha manual.
    """
    dia = _dia_semana(data_agendada)

    consulta = (
        session.query(DisponibilidadeVeiculo)
        .join(Veiculo)
        .filter(
            DisponibilidadeVeiculo.grupo_rota_id == grupo.id,
            DisponibilidadeVeiculo.inicio_periodo <= data_agendada,
            DisponibilidadeVeiculo.fim_periodo >= data_agendada,
            DisponibilidadeVeiculo.ativo.is_(True),
            Veiculo.ativo.is_(True),
            Veiculo.capacidade_passageiros >= capacidade_minima,
        )
    )

    disponibilidades = []
    for disponibilidade in consulta.all():
        dias = _parse_dias_semana(disponibilidade.dias_semana)
        if dias and dia not in dias:
            continue
        disponibilidades.append(disponibilidade)

    if not disponibilidades:
        raise ValueError("Nenhum veículo disponível atende à capacidade e ao período desejados.")

    if veiculo_id is not None:
        for disponibilidade in disponibilidades:
            if disponibilidade.veiculo_id == veiculo_id:
                return disponibilidade.veiculo, disponibilidade
        raise ValueError("Veículo informado não está disponível para o período ou capacidade.")

    # Escolha automática: prioriza menor custo relativo e maior capacidade em caso de empate.
    disponibilidades.sort(
        key=lambda disp: (
            CUSTO_RELATIVO_CATEGORIA.get(disp.veiculo.categoria_custo, 99),
            -disp.veiculo.capacidade_passageiros,
        )
    )
    escolhida = disponibilidades[0]
    return escolhida.veiculo, escolhida


def _gerar_matriz_distancia(coords: Sequence[Tuple[float, float]]) -> List[List[int]]:
    """
    Constrói a matriz de distâncias (em metros) entre todos os pontos, arredondando para inteiros.
    """
    matriz: List[List[int]] = []
    for origem in coords:
        linha = []
        for destino in coords:
            if origem == destino:
                linha.append(0)
            else:
                linha.append(int(distance_km(origem, destino) * 1000))  # distancia em metros
        matriz.append(linha)
    return matriz


def _resolver_ordem_embarque(
    coords: Sequence[Tuple[float, float]],
    indice_destino_final: int,
) -> List[int]:
    """
    Resolve um problema de caixeiro viajante simples para ordenar paradas.

    O índice 0 é o motorista (ponto de partida) e `indice_destino_final` marca o destino fixo.
    Retorna somente a ordem dos passageiros (índices intermediários).
    """
    if indice_destino_final <= 0 or indice_destino_final >= len(coords):
        raise ValueError("Índice do destino final inválido para a matriz de coordenadas.")

    if len(coords) <= 2:
        return []

    dist_matrix = _gerar_matriz_distancia(coords)
    manager = pywrapcp.RoutingIndexManager(
        len(dist_matrix),
        1,
        [0],
        [indice_destino_final],
    )
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index: int, to_index: int) -> int:
        origem = manager.IndexToNode(from_index)
        destino = manager.IndexToNode(to_index)
        return dist_matrix[origem][destino]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search_parameters.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search_parameters.time_limit.FromSeconds(5)

    solution = routing.SolveWithParameters(search_parameters)
    if solution is None:
        raise RuntimeError("Falha ao resolver a otimização de rota. Tente novamente mais tarde.")

    # Extrai a ordem de visita do veículo (excluindo o depósito final).
    ordem_passageiros: List[int] = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        node_index = manager.IndexToNode(index)
        if node_index not in (0, indice_destino_final):
            ordem_passageiros.append(node_index)
        index = solution.Value(routing.NextVar(index))
    return ordem_passageiros


def _calcular_distancia_total(
    coords: Sequence[Tuple[float, float]],
    ordem_passageiros: Sequence[int],
    indice_destino_final: int,
) -> float:
    """
    Calcula a distância percorrida até o destino fixo informado.
    """
    if indice_destino_final <= 0 or indice_destino_final >= len(coords):
        raise ValueError("Índice do destino final inválido para cálculo de distância.")

    total = 0.0
    atual = coords[0]

    if not ordem_passageiros:
        return distance_km(atual, coords[indice_destino_final])

    for idx in ordem_passageiros:
        proximo = coords[idx]
        total += distance_km(atual, proximo)
        atual = proximo
    total += distance_km(atual, coords[indice_destino_final])
    return total


def _sugerir_veiculos_para_quantidade(qtd_pessoas: int) -> List[dict]:
    """
    Sugere veículos adicionais (hatch ou sedan) para acomodar a quantidade informada.
    """
    if qtd_pessoas <= 0:
        return []

    sugestoes: List[dict] = []
    num_sedan = qtd_pessoas // 5
    resto = qtd_pessoas % 5

    if num_sedan:
        sugestoes.append(
            {
                "tipo": "sedan",
                "quantidade": num_sedan,
                "capacidade_por_veiculo": 5,
                "passageiros_atendidos": min(num_sedan * 5, qtd_pessoas),
            }
        )

    if resto:
        if resto <= 4:
            sugestoes.append(
                {
                    "tipo": "hatch",
                    "quantidade": 1,
                    "capacidade_por_veiculo": 4,
                    "passageiros_atendidos": resto,
                }
            )
        else:  # resto maior que 4 não ocorre com base no cálculo, mas fica como salvaguarda
            sugestoes.append(
                {
                    "tipo": "sedan",
                    "quantidade": 1,
                    "capacidade_por_veiculo": 5,
                    "passageiros_atendidos": resto,
                }
            )

    return sugestoes


def recalcular_rota_existente(session: Session, rota_id: int) -> Rota:
    rota = session.get(Rota, rota_id)
    if not rota:
        raise ValueError("Rota não encontrada para recalcular.")
    if not rota.destino:
        raise ValueError("Rota não possui destino configurado.")

    destino = rota.destino
    if destino.latitude is None or destino.longitude is None:
        endereco_destino = _montar_endereco_destino(destino)
        destino.latitude, destino.longitude = geocode_address(endereco_destino)

    atribuicoes = sorted(
        rota.atribuicoes,
        key=lambda atr: atr.ordem_embarque if atr.ordem_embarque is not None else 999,
    )
    if not atribuicoes:
        raise ValueError("Rota não possui atribuições para recalcular.")

    funcionarios_ids = {atr.funcionario_id for atr in atribuicoes}
    funcionarios = (
        session.query(Funcionario)
        .filter(Funcionario.id.in_(funcionarios_ids))
        .all()
    )
    funcionarios_map = {func.id: func for func in funcionarios}
    if rota.motorista_id and rota.motorista_id not in funcionarios_map:
        motorista_extra = session.get(Funcionario, rota.motorista_id)
        if motorista_extra:
            funcionarios_map[motorista_extra.id] = motorista_extra

    if not funcionarios_map:
        raise ValueError("Não foi possível obter os funcionários vinculados à rota.")

    coordenadas_funcionarios = _obter_coordenadas_funcionarios(list(funcionarios_map.values()))

    motorista = funcionarios_map.get(rota.motorista_id) if rota.motorista_id else None
    if motorista is None:
        motorista = funcionarios_map.get(atribuicoes[0].funcionario_id)
    if motorista is None:
        raise ValueError("Motorista não encontrado para recalcular a rota.")

    passageiros = [
        funcionarios_map[atr.funcionario_id]
        for atr in atribuicoes
        if atr.funcionario_id != motorista.id
    ]

    coordenadas: List[Tuple[float, float]] = []
    funcionarios_trajeto: List[Funcionario] = [motorista] + passageiros
    for funcionario in funcionarios_trajeto:
        coord = coordenadas_funcionarios.get(funcionario.id)
        if coord is None:
            raise ValueError(f"Coordenadas indisponíveis para {funcionario.nome_completo}.")
        coordenadas.append(coord)

    destino_coordenadas = (destino.latitude, destino.longitude)
    coordenadas_com_destino = coordenadas + [destino_coordenadas]
    indice_destino_final = len(coordenadas_com_destino) - 1
    ordem_passageiros = _resolver_ordem_embarque(coordenadas_com_destino, indice_destino_final)

    ordem_map: dict[int, int] = {motorista.id: 0}
    for indice, idx_passageiro in enumerate(ordem_passageiros, start=1):
        if idx_passageiro >= len(funcionarios_trajeto):
            continue
        funcionario = funcionarios_trajeto[idx_passageiro]
        ordem_map[funcionario.id] = indice

    for atribuicao in rota.atribuicoes:
        ordem = ordem_map.get(atribuicao.funcionario_id)
        if ordem is not None:
            atribuicao.ordem_embarque = ordem
        coord = coordenadas_funcionarios.get(atribuicao.funcionario_id)
        if coord:
            atribuicao.latitude, atribuicao.longitude = coord

    distancia_total_km = _calcular_distancia_total(
        coordenadas_com_destino,
        ordem_passageiros,
        indice_destino_final,
    )
    rota.distancia_total_km = round(distancia_total_km, 2)
    fator_custo = CUSTO_RELATIVO_CATEGORIA.get(
        rota.veiculo.categoria_custo if rota.veiculo else CategoriaCustoVeiculo.BAIXO,
        1.0,
    )
    rota.custo_operacional_total = round(distancia_total_km * fator_custo, 2)

    session.commit()
    session.refresh(rota)
    return rota


@dataclass
class FuncionarioPlanejamento:
    funcionario: Funcionario
    coordenadas: Tuple[float, float]


@dataclass
class VeiculoPlanejado:
    veiculo: Veiculo
    disponibilidade: DisponibilidadeVeiculo
    capacidade_util: int
    custo_relativo: float
    terceirizado: bool


@dataclass
class RotaPlanejadaVRP:
    veiculo: Veiculo
    disponibilidade: DisponibilidadeVeiculo
    funcionario_ids: List[int]
    distancia_m: int
    duracao_s: int
    custo_estimado: float


def _listar_frota_disponivel(
    session: Session,
    grupo: GrupoRota,
    data_agendada: date,
    incluir_terceirizados: bool,
    veiculos_ids: Optional[Sequence[int]] = None,
    maximo_veiculos: Optional[int] = None,
) -> List[VeiculoPlanejado]:
    dia = _dia_semana(data_agendada)
    consulta = (
        session.query(DisponibilidadeVeiculo)
        .join(Veiculo)
        .filter(
            DisponibilidadeVeiculo.inicio_periodo <= data_agendada,
            DisponibilidadeVeiculo.fim_periodo >= data_agendada,
            DisponibilidadeVeiculo.ativo.is_(True),
            Veiculo.ativo.is_(True),
        )
    )
    consulta = consulta.filter(
        (DisponibilidadeVeiculo.grupo_rota_id == grupo.id) | (DisponibilidadeVeiculo.grupo_rota_id.is_(None))
    )
    if veiculos_ids:
        consulta = consulta.filter(DisponibilidadeVeiculo.veiculo_id.in_(veiculos_ids))

    frota: List[VeiculoPlanejado] = []
    for disponibilidade in consulta.all():
        if not incluir_terceirizados and disponibilidade.tipo == TipoDisponibilidadeVeiculoEnum.ALUGUEL:
            continue
        dias = _parse_dias_semana(disponibilidade.dias_semana)
        if dias and dia not in dias:
            continue
        capacidade_util = max(disponibilidade.veiculo.capacidade_passageiros - 1, 0)
        if capacidade_util <= 0:
            continue
        frota.append(
            VeiculoPlanejado(
                veiculo=disponibilidade.veiculo,
                disponibilidade=disponibilidade,
                capacidade_util=capacidade_util,
                custo_relativo=CUSTO_RELATIVO_CATEGORIA.get(disponibilidade.veiculo.categoria_custo, 1.0),
                terceirizado=disponibilidade.tipo == TipoDisponibilidadeVeiculoEnum.ALUGUEL,
            )
        )

    frota.sort(
        key=lambda disp: (
            disp.terceirizado,
            disp.custo_relativo,
            -disp.capacidade_util,
        )
    )
    if maximo_veiculos:
        frota = frota[:maximo_veiculos]
    return frota


def _montar_chave_cache_vrp(
    requisicao: RequisicaoGerarRota,
    destino_coordenadas: Tuple[float, float],
    funcionarios_planejados: Sequence[FuncionarioPlanejamento],
    frota: Sequence[VeiculoPlanejado],
) -> Tuple[str, str]:
    funcionarios_payload = [
        {
            "id": item.funcionario.id,
            "lat": round(item.coordenadas[0], 5),
            "lon": round(item.coordenadas[1], 5),
        }
        for item in sorted(funcionarios_planejados, key=lambda fp: fp.funcionario.id)
    ]
    veiculos_payload = [
        {
            "id": item.veiculo.id,
            "capacidade": item.capacidade_util,
            "terceirizado": item.terceirizado,
            "categoria": item.veiculo.categoria_custo.value if item.veiculo.categoria_custo else None,
        }
        for item in frota
    ]
    payload_dict = {
        "empresa_id": requisicao.empresa_id,
        "grupo_rota_id": requisicao.grupo_rota_id,
        "data": requisicao.data_agendada.isoformat(),
        "turno": requisicao.turno.value,
        "destino": [round(destino_coordenadas[0], 5), round(destino_coordenadas[1], 5)],
        "funcionarios": funcionarios_payload,
        "veiculos": veiculos_payload,
    }
    raw = json.dumps(payload_dict, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest(), raw


def _obter_plano_cacheado(session: Session, chave: str) -> Optional[dict]:
    if not chave:
        return None
    ttl = timedelta(minutes=settings.ROTEIRIZACAO_CACHE_TTL_MINUTES)
    registro = session.query(CacheResultadoVRP).filter(CacheResultadoVRP.chave_contexto == chave).first()
    if not registro:
        return None
    if registro.atualizado_em and datetime.utcnow() - registro.atualizado_em > ttl:
        return None
    try:
        return json.loads(registro.payload)
    except json.JSONDecodeError:
        return None


def _armazenar_plano_cacheado(session: Session, chave: str, payload: dict) -> None:
    if not chave:
        return
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    registro = session.query(CacheResultadoVRP).filter(CacheResultadoVRP.chave_contexto == chave).first()
    if registro:
        registro.payload = raw
    else:
        session.add(
            CacheResultadoVRP(
                chave_contexto=chave,
                payload=raw,
            )
        )


def _serializar_plano_vrp(rotas: Sequence[RotaPlanejadaVRP], pendentes: Sequence[int]) -> dict:
    return {
        "rotas": [
            {
                "veiculo_id": rota.veiculo.id if rota.veiculo else None,
                "disponibilidade_id": rota.disponibilidade.id if rota.disponibilidade else None,
                "funcionarios": rota.funcionario_ids,
                "distancia_m": rota.distancia_m,
                "duracao_s": rota.duracao_s,
                "custo": rota.custo_estimado,
            }
            for rota in rotas
        ],
        "pendentes": list(pendentes),
    }


def _converter_cache_para_plano(
    payload: dict,
    frota: Sequence[VeiculoPlanejado],
) -> Optional[Tuple[List[RotaPlanejadaVRP], List[int]]]:
    frota_por_id = {item.veiculo.id: item for item in frota}
    rotas_cache: List[RotaPlanejadaVRP] = []
    for rota_payload in payload.get("rotas", []):
        veiculo_id = rota_payload.get("veiculo_id")
        veiculo_planejado = frota_por_id.get(veiculo_id)
        if not veiculo_planejado:
            return None
        rotas_cache.append(
            RotaPlanejadaVRP(
                veiculo=veiculo_planejado.veiculo,
                disponibilidade=veiculo_planejado.disponibilidade,
                funcionario_ids=list(rota_payload.get("funcionarios", [])),
                distancia_m=int(rota_payload.get("distancia_m", 0)),
                duracao_s=int(rota_payload.get("duracao_s", 0)),
                custo_estimado=float(rota_payload.get("custo", 0.0)),
            )
        )
    pendentes = list(payload.get("pendentes", []))
    return rotas_cache, pendentes


def _montar_funcionarios_planejados(
    funcionarios: Sequence[Funcionario],
    coordenadas: Dict[int, Tuple[float, float]],
) -> List[FuncionarioPlanejamento]:
    planejados: List[FuncionarioPlanejamento] = []
    for funcionario in sorted(funcionarios, key=lambda f: f.id):
        coord = coordenadas.get(funcionario.id)
        if coord is None:
            raise ValueError("Falha ao obter coordenadas geocodificadas para um funcionário.")
        planejados.append(FuncionarioPlanejamento(funcionario=funcionario, coordenadas=coord))
    return planejados


def _matrizes_trajeto(coords: Sequence[Tuple[float, float]]) -> Tuple[List[List[int]], List[List[int]]]:
    try:
        return montar_matrizes_osrm(coords)
    except OSRMServiceError:
        distancias = _gerar_matriz_distancia(coords)
        # Aproxima duração assumindo 32 km/h de média.
        duracoes: List[List[int]] = []
        for linha in distancias:
            nova_linha: List[int] = []
            for distancia_m in linha:
                duracao_segundos = int(round((distancia_m / 1000) / 32 * 3600)) if distancia_m else 0
                nova_linha.append(max(duracao_segundos, 0))
            duracoes.append(nova_linha)
        return distancias, duracoes


def _somar_metricas_da_rota(matriz: Sequence[Sequence[int]], rota_nodes: Sequence[int]) -> int:
    total = 0
    atual = 0
    for node in rota_nodes:
        total += matriz[atual][node]
        atual = node
    total += matriz[atual][0]
    return total


def _resolver_vrp_multi(
    funcionarios_planejados: Sequence[FuncionarioPlanejamento],
    destino_coordenadas: Tuple[float, float],
    frota: Sequence[VeiculoPlanejado],
) -> Tuple[List[RotaPlanejadaVRP], List[int]]:
    if not funcionarios_planejados:
        return [], []
    if not frota:
        raise ValueError("Nenhum veículo disponível para gerar rotas VRP.")

    coordenadas_solver = [destino_coordenadas] + [fp.coordenadas for fp in funcionarios_planejados]
    distancia_matriz, duracao_matriz = _matrizes_trajeto(coordenadas_solver)

    manager = pywrapcp.RoutingIndexManager(len(distancia_matriz), len(frota), 0)
    routing = pywrapcp.RoutingModel(manager)

    def distancia_callback(from_index: int, to_index: int) -> int:
        origem = manager.IndexToNode(from_index)
        destino = manager.IndexToNode(to_index)
        return distancia_matriz[origem][destino]

    transit_callback_index = routing.RegisterTransitCallback(distancia_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    def demanda_callback(from_index: int) -> int:
        node = manager.IndexToNode(from_index)
        return 0 if node == 0 else 1

    demanda_index = routing.RegisterUnaryTransitCallback(demanda_callback)
    capacidades = [max(v.capacidade_util, 1) for v in frota]
    routing.AddDimensionWithVehicleCapacity(
        demanda_index,
        0,
        capacidades,
        True,
        "Capacity",
    )

    penalty = 10_000_000
    for node in range(1, len(distancia_matriz)):
        routing.AddDisjunction([manager.NodeToIndex(node)], penalty)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.SAVINGS
    search_parameters.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search_parameters.time_limit.FromSeconds(20)

    solution = routing.SolveWithParameters(search_parameters)
    if solution is None:
        raise RuntimeError("Falha ao resolver o VRP multi-veículos. Tente novamente mais tarde.")

    rotas_planejadas: List[RotaPlanejadaVRP] = []
    funcionarios_atendidos: set[int] = set()

    for idx_veiculo in range(len(frota)):
        index = routing.Start(idx_veiculo)
        rota_nodes: List[int] = []
        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)
            if node_index != 0:
                rota_nodes.append(node_index)
            index = solution.Value(routing.NextVar(index))
        if not rota_nodes:
            continue
        funcionarios_ids = [funcionarios_planejados[node - 1].funcionario.id for node in rota_nodes]
        funcionarios_atendidos.update(funcionarios_ids)
        distancia_total = _somar_metricas_da_rota(distancia_matriz, rota_nodes)
        duracao_total = _somar_metricas_da_rota(duracao_matriz, rota_nodes)
        veiculo_planejado = frota[idx_veiculo]
        custo_estimado = (distancia_total / 1000) * veiculo_planejado.custo_relativo
        rotas_planejadas.append(
            RotaPlanejadaVRP(
                veiculo=veiculo_planejado.veiculo,
                disponibilidade=veiculo_planejado.disponibilidade,
                funcionario_ids=funcionarios_ids,
                distancia_m=distancia_total,
                duracao_s=duracao_total,
                custo_estimado=custo_estimado,
            )
        )

    nao_alocados = [
        fp.funcionario.id
        for fp in funcionarios_planejados
        if fp.funcionario.id not in funcionarios_atendidos
    ]
    return rotas_planejadas, nao_alocados


def _persistir_rotas_vrp(
    session: Session,
    empresa: Empresa,
    grupo: GrupoRota,
    destino: DestinoRota,
    destino_coordenadas: Tuple[float, float],
    requisicao: RequisicaoGerarRota,
    rotas_planejadas: Sequence[RotaPlanejadaVRP],
    pendentes: Sequence[int],
    coordenadas_funcionarios: Dict[int, Tuple[float, float]],
    funcionarios_por_id: Dict[int, Funcionario],
) -> List[Rota]:
    if not rotas_planejadas:
        raise ValueError("Nenhuma rota pôde ser montada com a frota disponível.")

    rotas_criadas: List[Rota] = []
    sequencia = 1
    sugestoes = _sugerir_veiculos_para_quantidade(len(pendentes)) if pendentes else []

    for plano in rotas_planejadas:
        distancia_km = round(plano.distancia_m / 1000, 2)
        rota = Rota(
            empresa_id=empresa.id,
            grupo_rota_id=grupo.id,
            veiculo_id=plano.veiculo.id if plano.veiculo else None,
            disponibilidade_veiculo_id=plano.disponibilidade.id if plano.disponibilidade else None,
            motorista_id=None,
            destino_id=destino.id,
            data_agendada=requisicao.data_agendada,
            turno=requisicao.turno,
            status=StatusRotaEnum.AGENDADA,
            modo_geracao=ModoAlgoritmoEnum.AUTOMATICO,
            sequencia_planejamento=sequencia,
            distancia_total_km=distancia_km,
            custo_operacional_total=round(plano.custo_estimado, 2),
            observacoes="Rota VRP gerada automaticamente com base na frota disponível.",
        )
        session.add(rota)
        session.flush()

        funcionarios_rota = [
            funcionarios_por_id[func_id]
            for func_id in plano.funcionario_ids
            if func_id in funcionarios_por_id
        ]

        motorista: Optional[Funcionario] = None
        if funcionarios_rota:
            try:
                motorista = _selecionar_motorista(
                    funcionarios_rota,
                    None,
                    coordenadas=coordenadas_funcionarios,
                    destino_coordenadas=destino_coordenadas,
                )
            except ValueError:
                motorista = None
        if motorista:
            rota.motorista_id = motorista.id

        for ordem, funcionario in enumerate(funcionarios_rota, start=1):
            coordenadas = coordenadas_funcionarios.get(funcionario.id)
            session.add(
                AtribuicaoRota(
                    rota_id=rota.id,
                    funcionario_id=funcionario.id,
                    papel=PapelAtribuicaoRota.MOTORISTA if motorista and funcionario.id == motorista.id else PapelAtribuicaoRota.PASSAGEIRO,
                    ordem_embarque=ordem,
                    latitude=coordenadas[0] if coordenadas else None,
                    longitude=coordenadas[1] if coordenadas else None,
                )
            )

        session.add(
            LogGeracaoRota(
                rota_id=rota.id,
                quantidade_funcionarios=len(funcionarios_rota),
                veiculo_id=plano.veiculo.id if plano.veiculo else None,
                motorista_id=motorista.id if motorista else None,
                observacoes="Rota VRP gerada automaticamente.",
            )
        )
        rota.sugestoes_veiculos = sugestoes
        rotas_criadas.append(rota)
        sequencia += 1

    for pendente_id in pendentes:
        session.add(
            FuncionarioPendenteRota(
                rota_id=None,
                funcionario_id=pendente_id,
                data_agendada=requisicao.data_agendada,
                turno=requisicao.turno,
                motivo="Capacidade total da frota atingida para o turno selecionado.",
                grupo_rota_id=grupo.id,
            )
        )

    session.commit()
    for rota in rotas_criadas:
        session.refresh(rota)
    return rotas_criadas


# ---------------------------------------------------------------------------
# Função principal de geração automática
# ---------------------------------------------------------------------------

def gerar_rota_automatica(session: Session, requisicao: RequisicaoGerarRota) -> Rota:
    """
    Gera uma rota completa com base nas regras de negócio e registros de disponibilidade.
    """
    empresa: Empresa | None = session.get(Empresa, requisicao.empresa_id)
    if not empresa:
        raise ValueError("Empresa não encontrada.")

    grupo: GrupoRota | None = session.get(GrupoRota, requisicao.grupo_rota_id)
    if not grupo or grupo.empresa_id != empresa.id:
        raise ValueError("Grupo de rota inválido para a empresa informada.")

    if requisicao.data_agendada < date.today():
        raise ValueError("Não é possível gerar rotas em datas passadas.")

    funcionarios_disponiveis = _filtrar_funcionarios_disponiveis(
        session=session,
        grupo=grupo,
        data_agendada=requisicao.data_agendada,
        turno=requisicao.turno,
    )
    if not funcionarios_disponiveis:
        raise ValueError("Nenhum funcionário disponível para o grupo, data e turno informados.")

    destino: DestinoRota | None = None
    destino_coordenadas: Tuple[float, float]
    if requisicao.destino_id is not None:
        destino = session.get(DestinoRota, requisicao.destino_id)
        if not destino or destino.empresa_id != empresa.id:
            raise ValueError("Destino informado é inválido para a empresa selecionada.")
        endereco_destino = _montar_endereco_destino(destino)
        if destino.latitude is not None and destino.longitude is not None:
            destino_coordenadas = (destino.latitude, destino.longitude)
        else:
            try:
                destino_coordenadas = geocode_address(endereco_destino)
            except (GeocodeError, GeocoderServiceError) as exc:
                raise ValueError(f"Falha ao geocodificar o destino selecionado: {exc}") from exc
            destino.latitude, destino.longitude = destino_coordenadas
    else:
        campos_obrigatorios = [
            ("destino_logradouro", requisicao.destino_logradouro),
            ("destino_numero", requisicao.destino_numero),
            ("destino_bairro", requisicao.destino_bairro),
            ("destino_cidade", requisicao.destino_cidade),
            ("destino_estado", requisicao.destino_estado),
            ("destino_cep", requisicao.destino_cep),
        ]
        faltantes = [campo for campo, valor in campos_obrigatorios if not (valor and valor.strip())]
        if faltantes:
            raise ValueError("Informe um destino_id válido ou todos os campos de endereço do destino (logradouro, número, bairro, cidade, estado, CEP).")

        destino_nome = (requisicao.destino_nome or empresa.nome).strip()
        destino_estado = requisicao.destino_estado.strip().upper()
        destino_cep = requisicao.destino_cep.replace(" ", "").strip()
        destino_complemento = requisicao.destino_complemento.strip() if requisicao.destino_complemento else None

        endereco_componentes = [
            ', '.join(filter(None, [requisicao.destino_logradouro.strip(), requisicao.destino_numero.strip()])),
            destino_complemento,
            requisicao.destino_bairro.strip(),
            f"{requisicao.destino_cidade.strip()} - {destino_estado}",
            destino_cep,
            "Brasil",
        ]
        destino_endereco = ', '.join(filter(None, endereco_componentes))

        try:
            destino_coordenadas = geocode_address(destino_endereco)
        except (GeocodeError, GeocoderServiceError) as exc:
            raise ValueError(f"Falha ao geocodificar o destino final: {exc}") from exc

        destino = DestinoRota(
            empresa_id=empresa.id,
            nome=destino_nome,
            logradouro=requisicao.destino_logradouro.strip(),
            numero=requisicao.destino_numero.strip(),
            complemento=destino_complemento,
            bairro=requisicao.destino_bairro.strip(),
            cidade=requisicao.destino_cidade.strip(),
            estado=destino_estado,
            cep=destino_cep,
            latitude=destino_coordenadas[0],
            longitude=destino_coordenadas[1],
            ativo=True,
        )
        session.add(destino)
        session.flush()

    try:
        coordenadas_funcionarios = _obter_coordenadas_funcionarios(funcionarios_disponiveis)
    except GeocodeError as exc:
        raise ValueError(str(exc)) from exc
    except GeocoderServiceError as exc:
        raise ValueError(f"Falha ao geocodificar um endereço: {exc}") from exc

    motorista = _selecionar_motorista(
        funcionarios_disponiveis,
        requisicao.motorista_id,
        coordenadas=coordenadas_funcionarios,
        destino_coordenadas=destino_coordenadas,
    )

    passageiros = [f for f in funcionarios_disponiveis if f.id != motorista.id]
    if not passageiros:
        raise ValueError("Não há passageiros para gerar rota além do motorista selecionado.")

    veiculo: Veiculo | None = None
    disponibilidade: DisponibilidadeVeiculo | None = None
    passageiros_alocados = passageiros
    passageiros_pendentes: List[Funcionario] = []
    sugestoes_adicionais: List[dict] = []

    try:
        veiculo, disponibilidade = _selecionar_disponibilidade_veiculo(
            session=session,
            grupo=grupo,
            data_agendada=requisicao.data_agendada,
            capacidade_minima=len(passageiros) + 1,  # motorista + passageiros
            veiculo_id=requisicao.veiculo_id,
        )
    except CapacidadeVeiculoInsuficienteError as exc:
        sugestoes_adicionais = exc.sugestoes or _sugerir_veiculos_para_quantidade(len(passageiros) + 1)
    except ValueError:
        sugestoes_adicionais = _sugerir_veiculos_para_quantidade(len(passageiros) + 1)
    else:
        capacidade_util = max(veiculo.capacidade_passageiros - 1, 0)
        passageiros_alocados = passageiros[:capacidade_util] if capacidade_util > 0 else []
        passageiros_pendentes = passageiros[capacidade_util:]
        sugestoes_adicionais = _sugerir_veiculos_para_quantidade(len(passageiros_pendentes))

    # Geocodificação dos endereços para o motorista e passageiros alocados.
    coordenadas: List[Tuple[float, float]] = []
    funcionarios_trajeto: List[Funcionario] = [motorista] + passageiros_alocados

    for func in funcionarios_trajeto:
        coord = coordenadas_funcionarios.get(func.id)
        if coord is None:
            raise ValueError("Falha ao obter coordenadas geocodificadas para um funcionário.")
        coordenadas.append(coord)

    coordenadas_com_destino = coordenadas + [destino_coordenadas]
    indice_destino_final = len(coordenadas_com_destino) - 1

    ordem_passageiros = _resolver_ordem_embarque(coordenadas_com_destino, indice_destino_final)
    distancia_total_km = _calcular_distancia_total(
        coordenadas_com_destino,
        ordem_passageiros,
        indice_destino_final,
    )
    custo_estimado = distancia_total_km * CUSTO_RELATIVO_CATEGORIA.get(
        veiculo.categoria_custo if veiculo else CategoriaCustoVeiculo.BAIXO,
        1.0,
    )

    # Verifica se já existe rota para o mesmo dia/turno/grupo.
    rota_existente = (
        session.query(Rota)
        .filter(
            Rota.empresa_id == empresa.id,
            Rota.grupo_rota_id == grupo.id,
            Rota.data_agendada == requisicao.data_agendada,
            Rota.turno == requisicao.turno,
        )
        .one_or_none()
    )
    if rota_existente:
        raise ValueError("Já existe uma rota cadastrada para este grupo, data e turno.")

    status_rota = StatusRotaEnum.AGENDADA if veiculo else StatusRotaEnum.RASCUNHO

    rota = Rota(
        empresa_id=empresa.id,
        grupo_rota_id=grupo.id,
        veiculo_id=veiculo.id if veiculo else None,
        motorista_id=motorista.id,
        disponibilidade_veiculo_id=disponibilidade.id if disponibilidade else None,
        data_agendada=requisicao.data_agendada,
        turno=requisicao.turno,
        status=status_rota,
        modo_geracao=requisicao.modo_geracao,
        distancia_total_km=round(distancia_total_km, 2),
        custo_operacional_total=round(custo_estimado, 2),
        observacoes="Rota gerada automaticamente com base na disponibilidade de funcionários e veículos.",
        destino_id=destino.id,
    )
    session.add(rota)
    session.flush()  # obtém ID

    # Monta as atribuições respeitando a ordem calculada.
    session.add(
        AtribuicaoRota(
            rota_id=rota.id,
            funcionario_id=motorista.id,
            papel=PapelAtribuicaoRota.MOTORISTA,
            ordem_embarque=0,
            latitude=coordenadas[0][0],
            longitude=coordenadas[0][1],
        )
    )

    for ordem, idx_passageiro in enumerate(ordem_passageiros, start=1):
        if idx_passageiro >= len(funcionarios_trajeto):
            continue
        passageiro = funcionarios_trajeto[idx_passageiro]
        session.add(
            AtribuicaoRota(
                rota_id=rota.id,
                funcionario_id=passageiro.id,
                papel=PapelAtribuicaoRota.PASSAGEIRO,
                ordem_embarque=ordem,
                latitude=coordenadas[idx_passageiro][0],
                longitude=coordenadas[idx_passageiro][1],
            )
        )

    for pendente in passageiros_pendentes:
        session.add(
            FuncionarioPendenteRota(
                rota_id=rota.id,
                funcionario_id=pendente.id,
                data_agendada=requisicao.data_agendada,
                turno=requisicao.turno,
                motivo="Capacidade máxima do veículo atingida para o turno.",
                grupo_rota_id=grupo.id,
            )
        )

    session.add(
        LogGeracaoRota(
            rota_id=rota.id,
            quantidade_funcionarios=len(passageiros_alocados),
            veiculo_id=veiculo.id if veiculo else None,
            motorista_id=motorista.id,
            observacoes="Rota gerada automaticamente pela API.",
        )
    )

    session.commit()
    session.refresh(rota)
    rota.sugestoes_veiculos = sugestoes_adicionais
    return rota


def gerar_rotas_vrp(session: Session, requisicao: RequisicaoGerarRotasVRP) -> List[Rota]:
    empresa: Empresa | None = session.get(Empresa, requisicao.empresa_id)
    if not empresa:
        raise ValueError("Empresa não encontrada.")

    grupo: GrupoRota | None = session.get(GrupoRota, requisicao.grupo_rota_id)
    if not grupo or grupo.empresa_id != empresa.id:
        raise ValueError("Grupo de rota inválido para a empresa informada.")

    if requisicao.data_agendada < date.today():
        raise ValueError("Não é possível gerar rotas em datas passadas.")

    rotas_existentes = (
        session.query(Rota)
        .filter(
            Rota.empresa_id == empresa.id,
            Rota.grupo_rota_id == grupo.id,
            Rota.data_agendada == requisicao.data_agendada,
            Rota.turno == requisicao.turno,
        )
        .count()
    )
    if rotas_existentes:
        raise ValueError("Já existem rotas cadastradas para este grupo, data e turno.")

    funcionarios_disponiveis = _filtrar_funcionarios_disponiveis(
        session=session,
        grupo=grupo,
        data_agendada=requisicao.data_agendada,
        turno=requisicao.turno,
    )
    if not funcionarios_disponiveis:
        raise ValueError("Nenhum funcionário disponível para o grupo, data e turno informados.")

    destino, destino_coordenadas = _resolver_destino(session, empresa, requisicao)

    try:
        coordenadas_funcionarios = _obter_coordenadas_funcionarios(funcionarios_disponiveis)
    except GeocodeError as exc:
        raise ValueError(str(exc)) from exc
    except GeocoderServiceError as exc:
        raise ValueError(f"Falha ao geocodificar um endereço: {exc}") from exc

    funcionarios_planejados = _montar_funcionarios_planejados(funcionarios_disponiveis, coordenadas_funcionarios)

    frota_disponivel = _listar_frota_disponivel(
        session=session,
        grupo=grupo,
        data_agendada=requisicao.data_agendada,
        incluir_terceirizados=requisicao.usar_frota_terceirizada,
        veiculos_ids=requisicao.veiculos_ids,
        maximo_veiculos=requisicao.maximo_veiculos,
    )
    if not frota_disponivel:
        raise ValueError("Nenhum veículo disponível atende à capacidade e ao período desejados.")

    funcionarios_por_id = {func.id: func for func in funcionarios_disponiveis}

    chave_cache, contexto_raw = _montar_chave_cache_vrp(requisicao, destino_coordenadas, funcionarios_planejados, frota_disponivel)
    rotas_planejadas: Optional[List[RotaPlanejadaVRP]] = None
    pendentes: List[int] = []
    if not requisicao.ignorar_cache:
        cache_payload = _obter_plano_cacheado(session, chave_cache)
        if cache_payload:
            convertido = _converter_cache_para_plano(cache_payload, frota_disponivel)
            if convertido:
                rotas_planejadas, pendentes = convertido

    if rotas_planejadas is None:
        rotas_planejadas, pendentes = _resolver_vrp_multi(funcionarios_planejados, destino_coordenadas, frota_disponivel)
        plano_serializado = _serializar_plano_vrp(rotas_planejadas, pendentes)
        plano_serializado["contexto"] = json.loads(contexto_raw)
        _armazenar_plano_cacheado(session, chave_cache, plano_serializado)

    if rotas_planejadas is None:
        raise RuntimeError("Falha ao montar rotas VRP após leitura do cache.")

    rotas_criadas = _persistir_rotas_vrp(
        session=session,
        empresa=empresa,
        grupo=grupo,
        destino=destino,
        destino_coordenadas=destino_coordenadas,
        requisicao=requisicao,
        rotas_planejadas=rotas_planejadas,
        pendentes=pendentes,
        coordenadas_funcionarios=coordenadas_funcionarios,
        funcionarios_por_id=funcionarios_por_id,
    )
    return rotas_criadas

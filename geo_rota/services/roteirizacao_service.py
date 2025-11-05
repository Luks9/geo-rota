"""
Motor de geração automática de rotas.

Responsável por:
* Selecionar funcionários elegíveis para uma data/turno.
* Escolher motorista e veículo disponíveis (automático ou manual).
* Geocodificar endereços e montar a melhor sequência de embarque.
* Persistir a rota, atribuições, pendências e logs.
"""

from __future__ import annotations

from datetime import date
from typing import Dict, List, Optional, Sequence, Tuple

from geopy.exc import GeocoderServiceError
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, aliased

from geo_rota.models import (
    AtribuicaoRota,
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
    TurnoTrabalhoEnum,
)
from geo_rota.schemas.route import RequisicaoGerarRota
from geo_rota.utils import GeocodeError, distance_km, geocode_address

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


def _obter_coordenadas_funcionarios(
    funcionarios: Sequence[Funcionario],
) -> Dict[int, Tuple[float, float]]:
    """
    Geocodifica e retorna as coordenadas de cada funcionário disponibilizado.
    """
    coordenadas: Dict[int, Tuple[float, float]] = {}
    for funcionario in funcionarios:
        endereco = _montar_endereco_completo(funcionario)
        coordenadas[funcionario.id] = geocode_address(endereco)
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
    escalas = aliased(EscalaTrabalho)
    indisponibilidade = aliased(IndisponibilidadeFuncionario)
    query = (
        session.query(Funcionario)
        .join(
            FuncionarioGrupoRota,
            and_(
                FuncionarioGrupoRota.funcionario_id == Funcionario.id,
                FuncionarioGrupoRota.grupo_rota_id == grupo.id,
                or_(
                    FuncionarioGrupoRota.dia_semana.is_(None),
                    FuncionarioGrupoRota.dia_semana == dia,
                ),
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
    except (GeocodeError, GeocoderServiceError) as exc:
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

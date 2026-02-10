from __future__ import annotations

import json
from typing import List, Sequence, Tuple
from urllib import error, request

from geo_rota.core.config import settings


class OSRMServiceError(RuntimeError):
    """Erro base para consultas OSRM."""


def _format_coordinates(coords: Sequence[Tuple[float, float]]) -> str:
    partes = []
    for lat, lon in coords:
        partes.append(f"{lon:.6f},{lat:.6f}")
    return ";".join(partes)


def _normalizar_url(base_url: str) -> str:
    if base_url.endswith("/"):
        return base_url[:-1]
    return base_url


def montar_matrizes_osrm(coords: Sequence[Tuple[float, float]]) -> Tuple[List[List[int]], List[List[int]]]:
    """
    Retorna matrizes de distância (metros) e duração (segundos) oriundas do OSRM.
    """
    if len(coords) < 2:
        raise ValueError("São necessárias pelo menos duas coordenadas para montar a matriz OSRM.")

    base_url = _normalizar_url(settings.OSRM_BASE_URL)
    coords_param = _format_coordinates(coords)
    query = f"{base_url}/table/v1/{settings.OSRM_PROFILE}/{coords_param}?annotations=distance,duration"
    req = request.Request(query, headers={"User-Agent": "geo_rota_backend"})

    try:
        with request.urlopen(req, timeout=settings.OSRM_TIMEOUT) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except error.URLError as exc:
        raise OSRMServiceError(f"Falha ao consultar OSRM: {exc}") from exc

    if payload.get("code") != "Ok":
        raise OSRMServiceError(f"OSRM retornou erro: {payload.get('message') or payload.get('code')}")

    distancias = payload.get("distances")
    duracoes = payload.get("durations")
    if not distancias or not duracoes:
        raise OSRMServiceError("Resposta do OSRM não possui matrizes de distância/duração.")

    def _converter_matriz(matriz: Sequence[Sequence[float]], fator: float) -> List[List[int]]:
        convertida: List[List[int]] = []
        for linha in matriz:
            nova_linha: List[int] = []
            for valor in linha:
                if valor is None:
                    nova_linha.append(int(1e9))
                else:
                    nova_linha.append(int(round(valor * fator)))
            convertida.append(nova_linha)
        return convertida

    distancia_metros = _converter_matriz(distancias, 1.0)
    duracao_segundos = _converter_matriz(duracoes, 1.0)
    return distancia_metros, duracao_segundos

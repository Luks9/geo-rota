"""
Utilidades de geocodificação e cálculo de distância usando geopy.

Centralizamos as operações aqui para reutilização, cache e respeito
ao rate-limit dos provedores públicos de geolocalização.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Iterable, Tuple

from geopy.distance import geodesic
from geopy.extra.rate_limiter import RateLimiter
from geopy.geocoders import Nominatim

# Configuramos um geocodificador compartilhado com identificador único.
_geolocator = Nominatim(user_agent="geo_rota_backend", timeout=5)
# Envelopamos o método de geocodificação para impor um intervalo mínimo entre chamadas.
_rate_limited_geocode = RateLimiter(_geolocator.geocode, min_delay_seconds=1.0, swallow_exceptions=False)


class GeocodeError(RuntimeError):
    """Erro genérico para sinalizar falhas na geocodificação."""


@lru_cache(maxsize=512)
def geocode_address(endereco: str) -> Tuple[float, float]:
    """
    Converte um endereço textual (Rua, Cidade, UF, CEP, etc.) em coordenadas (lat, lon).

    Utiliza cache para acelerar chamadas repetidas durante a geração de rotas.
    """
    if not endereco:
        raise GeocodeError("Endereço vazio ou inválido para geocodificação.")

    location = _rate_limited_geocode(endereco)
    if location is None:
        raise GeocodeError(f"Não foi possível geocodificar o endereço: '{endereco}'")
    return float(location.latitude), float(location.longitude)


def distance_km(coord_a: Iterable[float], coord_b: Iterable[float]) -> float:
    """
    Calcula a distância geodésica em quilômetros entre dois pontos (lat, lon).

    Utilizamos geodesic por ser uma aproximação precisa para distâncias médias.
    """
    return float(geodesic(coord_a, coord_b).kilometers)

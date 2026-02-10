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
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from geo_rota.core.database import SessionLocal
from geo_rota.models.cache import CacheGeocodificacao

# Configuramos um geocodificador compartilhado com identificador único.
_geolocator = Nominatim(user_agent="geo_rota_backend", timeout=5)
# Envelopamos o método de geocodificação para impor um intervalo mínimo entre chamadas.
_rate_limited_geocode = RateLimiter(_geolocator.geocode, min_delay_seconds=1.0, swallow_exceptions=False)


class GeocodeError(RuntimeError):
    """Erro genérico para sinalizar falhas na geocodificação."""


def _normalizar_endereco(endereco: str) -> str:
    return " ".join(endereco.strip().lower().split())


def _obter_cache_persistente(endereco_normalizado: str) -> Tuple[float, float] | None:
    if not endereco_normalizado:
        return None
    with SessionLocal() as session:
        registro = session.execute(
            select(CacheGeocodificacao).where(CacheGeocodificacao.endereco_normalizado == endereco_normalizado)
        ).scalar_one_or_none()
        if registro:
            return float(registro.latitude), float(registro.longitude)
    return None


def _atualizar_cache_persistente(endereco_normalizado: str, latitude: float, longitude: float) -> None:
    if not endereco_normalizado:
        return
    try:
        with SessionLocal() as session:
            existente = session.execute(
                select(CacheGeocodificacao).where(CacheGeocodificacao.endereco_normalizado == endereco_normalizado)
            ).scalar_one_or_none()
            if existente:
                existente.latitude = latitude
                existente.longitude = longitude
            else:
                session.add(
                    CacheGeocodificacao(
                        endereco_normalizado=endereco_normalizado,
                        latitude=latitude,
                        longitude=longitude,
                    )
                )
            session.commit()
    except SQLAlchemyError:
        # Cache persistente é best-effort; falhas não podem impedir a roteirização.
        pass


@lru_cache(maxsize=512)
def geocode_address(endereco: str) -> Tuple[float, float]:
    """
    Converte um endereço textual (Rua, Cidade, UF, CEP, etc.) em coordenadas (lat, lon).

    Utiliza cache persistente (BD) e em memória para acelerar chamadas repetidas.
    """
    if not endereco:
        raise GeocodeError("Endereço vazio ou inválido para geocodificação.")

    endereco_normalizado = _normalizar_endereco(endereco)
    coordenadas_cache = _obter_cache_persistente(endereco_normalizado)
    if coordenadas_cache:
        return coordenadas_cache

    location = _rate_limited_geocode(endereco)
    if location is None:
        raise GeocodeError(f"Não foi possível geocodificar o endereço: '{endereco}'")
    latitude, longitude = float(location.latitude), float(location.longitude)
    _atualizar_cache_persistente(endereco_normalizado, latitude, longitude)
    return latitude, longitude


def distance_km(coord_a: Iterable[float], coord_b: Iterable[float]) -> float:
    """
    Calcula a distância geodésica em quilômetros entre dois pontos (lat, lon).

    Utilizamos geodesic por ser uma aproximação precisa para distâncias médias.
    """
    return float(geodesic(coord_a, coord_b).kilometers)

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, UniqueConstraint

from geo_rota.models.model_base import Base


class CacheGeocodificacao(Base):
    __tablename__ = "cache_geocodificacao"
    __table_args__ = (
        UniqueConstraint("endereco_normalizado", name="uq_cache_geocodificacao_endereco"),
    )

    id = Column(Integer, primary_key=True, index=True)
    endereco_normalizado = Column(String(255), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class CacheResultadoVRP(Base):
    __tablename__ = "cache_resultado_vrp"
    __table_args__ = (
        UniqueConstraint("chave_contexto", name="uq_cache_resultado_vrp_chave"),
    )

    id = Column(Integer, primary_key=True, index=True)
    chave_contexto = Column(String(128), nullable=False, index=True)
    payload = Column(Text, nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

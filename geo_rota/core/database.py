from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from geo_rota.core.config import settings
from geo_rota.models.model_base import Base


# Engine configurada com opcao de debug e pooling
engine = create_engine(
    settings.DATABASE_URL,
    echo=(False),
    future=True,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)


# Funcao de dependencia para uso com FastAPI
def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Criacao automatica de tabelas quando em ambiente de desenvolvimento
if settings.ENVIRONMENT == "dev":
    Base.metadata.create_all(bind=engine)

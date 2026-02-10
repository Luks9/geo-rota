from typing import List

from pydantic_settings  import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./geo_rota.db"
    ENVIRONMENT: str = "dev"
    DB_USER: str = "meu_usuario"
    DB_PASSWORD: str = "minha_senha"
    SECRET_KEY: str = "supersecret"
    DEBUG: bool = True
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALGORITHM: str = "HS256"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173"]
    OSRM_BASE_URL: str = "http://router.project-osrm.org"
    OSRM_PROFILE: str = "driving"
    OSRM_TIMEOUT: int = 8
    ROTEIRIZACAO_CACHE_TTL_MINUTES: int = 60

    class Config:
        env_file = ".env"

settings = Settings()

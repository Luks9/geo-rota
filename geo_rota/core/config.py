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

    class Config:
        env_file = ".env"

settings = Settings()
{
  "empresa_id": 1,
  "grupo_rota_id": 1,
  "data_agendada": "2025-10-15",
  "turno": "MANHA",
  "modo_geracao": "automatico"
}

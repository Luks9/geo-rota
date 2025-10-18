from sqlalchemy import Boolean, Column, Enum as SQLEnum, Integer, String

from geo_rota.models.enums import RoleEnum
from geo_rota.models.model_base import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    role = Column(SQLEnum(RoleEnum), default=RoleEnum.USER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

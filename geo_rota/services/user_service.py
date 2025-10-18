from typing import Optional

from sqlalchemy.orm import Session

from geo_rota.core.security import get_password_hash, verify_password
from geo_rota.models.user import Usuario
from geo_rota.schemas.user import UserCreate, UserUpdate


def get_user_by_email(db: Session, email: str) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.id == user_id).first()


def create_user(db: Session, dados: UserCreate) -> Usuario:
    usuario = Usuario(
        nome=dados.nome,
        email=dados.email,
        hashed_password=get_password_hash(dados.senha),
        role=dados.role,
        is_active=True,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


def update_user(db: Session, user_id: int, dados: UserUpdate) -> Optional[Usuario]:
    usuario = get_user_by_id(db, user_id)
    if not usuario:
        return None

    dados_atualizados = dados.dict(exclude_unset=True)
    senha = dados_atualizados.pop("senha", None)
    for campo, valor in dados_atualizados.items():
        setattr(usuario, campo, valor)

    if senha:
        usuario.hashed_password = get_password_hash(senha)

    db.commit()
    db.refresh(usuario)
    return usuario


def authenticate_user(db: Session, email: str, senha: str) -> Optional[Usuario]:
    usuario = get_user_by_email(db, email)
    if not usuario:
        return None

    if not verify_password(senha, usuario.hashed_password):
        return None

    return usuario

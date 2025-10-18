from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from geo_rota.core.auth import get_current_active_user, require_admin
from geo_rota.core.database import get_db
from geo_rota.models.user import Usuario
from geo_rota.schemas import UserCreate, UserRead, UserUpdate
from geo_rota.services import create_user, get_user_by_email, get_user_by_id, update_user

router = APIRouter(prefix="/usuarios", tags=["Usuários"], dependencies=[Depends(get_current_active_user)])


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def criar_usuario(
    dados: UserCreate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserRead:
    if get_user_by_email(db, dados.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="E-mail já cadastrado")

    usuario = create_user(db, dados)
    return UserRead.from_orm(usuario)


@router.get("/me", response_model=UserRead)
def obter_usuario_atual(usuario: Usuario = Depends(get_current_active_user)) -> UserRead:
    return UserRead.from_orm(usuario)


@router.patch("/{usuario_id}", response_model=UserRead)
def atualizar_usuario(
    usuario_id: int,
    dados: UserUpdate,
    _: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserRead:
    usuario = update_user(db, usuario_id, dados)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    return UserRead.from_orm(usuario)

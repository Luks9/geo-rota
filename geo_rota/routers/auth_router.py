from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from geo_rota.core.config import settings
from geo_rota.core.database import get_db
from geo_rota.core.security import create_access_token
from geo_rota.schemas import Token
from geo_rota.services import authenticate_user

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/token", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    usuario = authenticate_user(db, form_data.username, form_data.password)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=usuario.id,
        expires_delta=access_token_expires,
        claims={"role": usuario.role.value},
    )
    return Token(access_token=access_token)

from typing import Iterable, Optional

from sqlalchemy.orm import Session

from geo_rota.models import DestinoRota
from geo_rota.schemas import DestinoRotaCreate, DestinoRotaUpdate
from geo_rota.utils.geocode import GeocodeError, geocode_address


ENDERECO_CAMPOS = ("logradouro", "numero", "complemento", "bairro", "cidade", "estado", "cep")


def _normalizar_campos(payload: dict) -> None:
    for campo in ("nome", "logradouro", "numero", "complemento", "bairro", "cidade"):
        if campo in payload and payload[campo] is not None:
            payload[campo] = payload[campo].strip()
    if "estado" in payload and payload["estado"] is not None:
        payload["estado"] = payload["estado"].strip().upper()
    if "cep" in payload and payload["cep"] is not None:
        payload["cep"] = payload["cep"].replace(" ", "").strip()


def _montar_endereco_completo(payload: dict) -> str:
    partes: list[str] = []
    logradouro = payload.get("logradouro", "")
    numero = payload.get("numero", "")
    complemento = payload.get("complemento")
    bairro = payload.get("bairro", "")
    cidade = payload.get("cidade", "")
    estado = payload.get("estado", "")
    cep = payload.get("cep", "")

    cabeca = ", ".join(filter(None, [logradouro, numero]))
    if cabeca:
        partes.append(cabeca)
    if complemento:
        partes.append(complemento)
    if bairro:
        partes.append(bairro)
    cidade_estado = " - ".join(filter(None, [cidade, estado]))
    if cidade_estado:
        partes.append(cidade_estado)
    if cep:
        partes.append(cep)
    partes.append("Brasil")
    return ", ".join(partes)


def criar_destino(db: Session, dados: DestinoRotaCreate) -> DestinoRota:
    payload = dados.dict()
    _normalizar_campos(payload)

    if payload.get("latitude") is None or payload.get("longitude") is None:
        endereco = _montar_endereco_completo(payload)
        try:
            latitude, longitude = geocode_address(endereco)
        except GeocodeError as exc:  # pragma: no cover - depende de serviço externo
            raise ValueError(str(exc)) from exc
        payload["latitude"] = latitude
        payload["longitude"] = longitude

    destino = DestinoRota(**payload)
    db.add(destino)
    db.commit()
    db.refresh(destino)
    return destino


def listar_destinos(
    db: Session,
    empresa_id: Optional[int] = None,
    apenas_ativos: bool = True,
) -> Iterable[DestinoRota]:
    consulta = db.query(DestinoRota)
    if empresa_id is not None:
        consulta = consulta.filter(DestinoRota.empresa_id == empresa_id)
    if apenas_ativos:
        consulta = consulta.filter(DestinoRota.ativo.is_(True))
    return consulta.order_by(DestinoRota.nome).all()


def obter_destino(db: Session, destino_id: int) -> Optional[DestinoRota]:
    return db.query(DestinoRota).filter(DestinoRota.id == destino_id).first()


def atualizar_destino(db: Session, destino_id: int, dados: DestinoRotaUpdate) -> Optional[DestinoRota]:
    destino = obter_destino(db, destino_id)
    if not destino:
        return None

    atualizacoes = dados.dict(exclude_unset=True)
    _normalizar_campos(atualizacoes)

    endereco_alterado = any(campo in atualizacoes for campo in ENDERECO_CAMPOS)

    for campo, valor in atualizacoes.items():
        setattr(destino, campo, valor)

    precisa_geocode = False
    if endereco_alterado and ("latitude" not in atualizacoes or "longitude" not in atualizacoes):
        precisa_geocode = True
    if destino.latitude is None or destino.longitude is None:
        precisa_geocode = True

    if precisa_geocode:
        endereco = _montar_endereco_completo(
            {
                "logradouro": destino.logradouro,
                "numero": destino.numero,
                "complemento": destino.complemento,
                "bairro": destino.bairro,
                "cidade": destino.cidade,
                "estado": destino.estado,
                "cep": destino.cep,
            }
        )
        try:
            latitude, longitude = geocode_address(endereco)
        except GeocodeError as exc:  # pragma: no cover - depende de serviço externo
            raise ValueError(str(exc)) from exc
        destino.latitude = latitude
        destino.longitude = longitude

    db.commit()
    db.refresh(destino)
    return destino


def remover_destino(db: Session, destino_id: int) -> bool:
    destino = obter_destino(db, destino_id)
    if not destino:
        return False

    db.delete(destino)
    db.commit()
    return True

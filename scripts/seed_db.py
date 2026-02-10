from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from geo_rota.core.database import SessionLocal, engine
from geo_rota.models import (
    DisponibilidadeVeiculo,
    Empresa,
    EscalaTrabalho,
    Funcionario,
    FuncionarioGrupoRota,
    GrupoRota,
    IndisponibilidadeFuncionario,
    DestinoRota,
    Veiculo,
)
from geo_rota.models.cache import CacheGeocodificacao
from geo_rota.models.enums import (
    CategoriaCustoVeiculo,
    RegimeRotaEnum,
    TipoDisponibilidadeVeiculoEnum,
    TipoIndisponibilidadeEnum,
    TurnoTrabalhoEnum,
)
from geo_rota.models.model_base import Base


def _normalizar_endereco(endereco: str) -> str:
    return " ".join(endereco.strip().lower().split())


def _montar_endereco_funcionario(funcionario: Funcionario) -> str:
    partes = [
        funcionario.logradouro,
        funcionario.numero,
        funcionario.complemento,
        funcionario.bairro,
        funcionario.cidade,
        funcionario.estado,
        funcionario.cep,
    ]
    return ", ".join(filter(None, partes))


def _montar_endereco_destino(destino: DestinoRota) -> str:
    partes = [
        destino.logradouro,
        destino.numero,
        destino.complemento,
        destino.bairro,
        f"{destino.cidade} - {destino.estado}",
        destino.cep,
        "Brasil",
    ]
    return ", ".join(filter(None, partes))


def get_or_create(session: Session, model, defaults=None, **filters):
    instance = session.query(model).filter_by(**filters).first()
    if instance:
        return instance, False
    params = {**filters}
    if defaults:
        params.update(defaults)
    instance = model(**params)
    session.add(instance)
    session.flush()
    return instance, True


COORDENADAS_TESTE_FUNCIONARIOS = {
    "123.456.789-00": (-5.8269, -35.2032),
    "987.654.321-00": (-5.7937, -35.2051),
    "321.654.987-00": (-5.8785, -35.1944),
    "654.987.321-00": (-5.9154, -35.2620),
}
COORDENADAS_DESTINO_BASE = (-5.8278546, -35.2062241)


def seed_empresas(session: Session) -> Empresa:
    empresa, _ = get_or_create(
        session,
        Empresa,
        codigo="GEO001",
        defaults={
            "nome": "GeoRota Matriz",
            "endereco_base": "Av. Prudente de Morais, 3500",
            "cidade": "Natal",
            "estado": "RN",
            "cep": "59064-620",
        },
    )
    return empresa


def seed_funcionarios(session: Session, empresa: Empresa) -> list[Funcionario]:
    colaboradores = [
        {
            "nome_completo": "Ana Souza",
            "cpf": "123.456.789-00",
            "email": "ana.souza@georota.dev",
            "telefone": "84999990001",
            "logradouro": "Rua Jaguarari",
            "numero": "2100",
            "bairro": "Lagoa Nova",
            "cidade": "Natal",
            "estado": "RN",
            "cep": "59063-500",
            "possui_cnh": True,
            "categoria_cnh": "B",
            "apto_dirigir": True,
        },
        {
            "nome_completo": "Bruno Lima",
            "cpf": "987.654.321-00",
            "email": "bruno.lima@georota.dev",
            "telefone": "84999990002",
            "logradouro": "Rua João XXIII",
            "numero": "45",
            "bairro": "Petrópolis",
            "cidade": "Natal",
            "estado": "RN",
            "cep": "59020-320",
            "possui_cnh": False,
            "apto_dirigir": False,
        },
        {
            "nome_completo": "Carla Ferreira",
            "cpf": "321.654.987-00",
            "email": "carla.ferreira@georota.dev",
            "telefone": "84999990003",
            "logradouro": "Av. Ayrton Senna",
            "numero": "2900",
            "bairro": "Neópolis",
            "cidade": "Natal",
            "estado": "RN",
            "cep": "59080-100",
            "possui_cnh": False,
            "apto_dirigir": False,
        },
        {
            "nome_completo": "Diego Martins",
            "cpf": "654.987.321-00",
            "email": "diego.martins@georota.dev",
            "telefone": "84999990004",
            "logradouro": "Rua São João",
            "numero": "150",
            "bairro": "Centro",
            "cidade": "Parnamirim",
            "estado": "RN",
            "cep": "59140-300",
            "possui_cnh": True,
            "categoria_cnh": "B",
            "apto_dirigir": True,
        },
    ]

    funcionarios: list[Funcionario] = []
    for dados in colaboradores:
        funcionario, _ = get_or_create(
            session,
            Funcionario,
            empresa_id=empresa.id,
            cpf=dados["cpf"],
            defaults=dados,
        )
        funcionarios.append(funcionario)

    session.commit()
    return funcionarios


def seed_destinos(session: Session, empresa: Empresa) -> DestinoRota:
    partes_endereco = empresa.endereco_base.split(",", 1)
    logradouro = partes_endereco[0].strip()
    numero = partes_endereco[1].strip() if len(partes_endereco) > 1 else "S/N"

    destino, _ = get_or_create(
        session,
        DestinoRota,
        empresa_id=empresa.id,
        nome=f"{empresa.nome} - Base",
        defaults={
            "logradouro": logradouro,
            "numero": numero,
            "complemento": None,
            "bairro": "Lagoa Nova",
            "cidade": empresa.cidade,
            "estado": empresa.estado,
            "cep": empresa.cep,
            "latitude": COORDENADAS_DESTINO_BASE[0],
            "longitude": COORDENADAS_DESTINO_BASE[1],
            "ativo": True,
        },
    )
    session.commit()
    return destino

def seed_escalas(session: Session, funcionarios: list[Funcionario]) -> None:
    dias_uteis = range(0, 5)  # segunda a sexta
    for funcionario in funcionarios:
        for dia in dias_uteis:
            get_or_create(
                session,
                EscalaTrabalho,
                funcionario_id=funcionario.id,
                dia_semana=dia,
                turno=TurnoTrabalhoEnum.MANHA,
                defaults={
                    "disponivel": True,
                },
            )
    session.commit()


def seed_grupos_rota(session: Session, empresa: Empresa) -> GrupoRota:
    grupo, _ = get_or_create(
        session,
        GrupoRota,
        empresa_id=empresa.id,
        nome="Terça a Quinta",
        defaults={
            "tipo_regime": RegimeRotaEnum.EMBARQUE,
            "dias_semana_padrao": [1, 2, 3],  # terça a quinta
            "descricao": "Grupo de embarque terça a quinta",
        },
    )
    return grupo


def seed_vinculos_grupo(session: Session, grupo: GrupoRota, funcionarios: list[Funcionario]) -> None:
    for funcionario in funcionarios:
        get_or_create(
            session,
            FuncionarioGrupoRota,
            funcionario_id=funcionario.id,
            grupo_rota_id=grupo.id,
        )
    session.commit()


def seed_veiculos(session: Session, empresa: Empresa) -> list[Veiculo]:
    dados = [
        {
            "placa": "ABC-1234",
            "tipo": "Economico",
            "capacidade_passageiros": 4,
            "consumo_medio_km_l": 12.5,
            "categoria_custo": CategoriaCustoVeiculo.BAIXO,
        },
        {
            "placa": "DEF-5678",
            "tipo": "Sedan",
            "capacidade_passageiros": 5,
            "consumo_medio_km_l": 10.2,
            "categoria_custo": CategoriaCustoVeiculo.MEDIO,
        },
    ]
    veiculos: list[Veiculo] = []
    for item in dados:
        veiculo, _ = get_or_create(
            session,
            Veiculo,
            empresa_id=empresa.id,
            placa=item["placa"],
            defaults=item,
        )
        veiculos.append(veiculo)
    session.commit()
    return veiculos


def seed_disponibilidades(
    session: Session,
    grupo: GrupoRota,
    veiculos: list[Veiculo],
) -> list[DisponibilidadeVeiculo]:
    hoje = date.today()
    proximos_30 = hoje + timedelta(days=30)
    disponibilidades: list[DisponibilidadeVeiculo] = []

    dados = [
        {
            "veiculo": veiculos[0],
            "tipo": TipoDisponibilidadeVeiculoEnum.FIXO,
            "renovacao_mensal": True,
            "dias_semana": "0,1,2,3,4",
        },
        {
            "veiculo": veiculos[1],
            "tipo": TipoDisponibilidadeVeiculoEnum.ALUGUEL,
            "renovacao_mensal": False,
            "dias_semana": "1,2,3",
        },
    ]

    for item in dados:
        disponibilidade, _ = get_or_create(
            session,
            DisponibilidadeVeiculo,
            veiculo_id=item["veiculo"].id,
            inicio_periodo=hoje,
            fim_periodo=proximos_30,
            defaults={
                "tipo": item["tipo"],
                "dias_semana": item["dias_semana"],
                "renovacao_mensal": item["renovacao_mensal"],
                "grupo_rota_id": grupo.id,
                "observacoes": "Disponibilidade inicial para testes",
            },
        )
        disponibilidades.append(disponibilidade)
    session.commit()
    return disponibilidades


def seed_indisponibilidades(session: Session, funcionarios: list[Funcionario]) -> None:
    hoje = date.today()
    periodo_ferias = {
        "funcionario_id": funcionarios[1].id if len(funcionarios) > 1 else funcionarios[0].id,
        "tipo": TipoIndisponibilidadeEnum.FERIAS,
        "motivo": "Férias programadas",
        "data_inicio": hoje + timedelta(days=3),
        "data_fim": hoje + timedelta(days=10),
    }
    get_or_create(session, IndisponibilidadeFuncionario, **periodo_ferias)
    session.commit()


def seed_cache_geocodificacao(
    session: Session,
    funcionarios: list[Funcionario],
    destino: Optional[DestinoRota],
) -> None:
    for funcionario in funcionarios:
        coordenadas = COORDENADAS_TESTE_FUNCIONARIOS.get(funcionario.cpf)
        if not coordenadas:
            continue
        endereco = _montar_endereco_funcionario(funcionario)
        chave = _normalizar_endereco(endereco)
        registro = session.query(CacheGeocodificacao).filter_by(endereco_normalizado=chave).first()
        if registro:
            registro.latitude, registro.longitude = coordenadas
        else:
            session.add(
                CacheGeocodificacao(
                    endereco_normalizado=chave,
                    latitude=coordenadas[0],
                    longitude=coordenadas[1],
                )
            )

    if destino:
        endereco_destino = _montar_endereco_destino(destino)
        chave_destino = _normalizar_endereco(endereco_destino)
        lat = destino.latitude if destino.latitude is not None else COORDENADAS_DESTINO_BASE[0]
        lon = destino.longitude if destino.longitude is not None else COORDENADAS_DESTINO_BASE[1]
        registro = session.query(CacheGeocodificacao).filter_by(endereco_normalizado=chave_destino).first()
        if registro:
            registro.latitude, registro.longitude = (lat, lon)
        else:
            session.add(
                CacheGeocodificacao(
                    endereco_normalizado=chave_destino,
                    latitude=lat,
                    longitude=lon,
                )
            )
    session.commit()


def run_seed() -> None:
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        empresa = seed_empresas(session)
        _destino_base = seed_destinos(session, empresa)
        funcionarios = seed_funcionarios(session, empresa)
        seed_escalas(session, funcionarios)
        grupo = seed_grupos_rota(session, empresa)
        seed_vinculos_grupo(session, grupo, funcionarios)
        veiculos = seed_veiculos(session, empresa)
        seed_disponibilidades(session, grupo, veiculos)
        seed_indisponibilidades(session, funcionarios)
        seed_cache_geocodificacao(session, funcionarios, _destino_base)
        session.commit()
        print(
            "Base de dados populada com sucesso! Utilize /rotas/gerar para o modo simples ou /rotas/gerar-vrp para o novo motor corporativo."
        )
    except Exception as exc:  # pragma: no cover
        session.rollback()
        raise RuntimeError("Falha ao popular base de dados") from exc
    finally:
        session.close()


if __name__ == "__main__":
    run_seed()

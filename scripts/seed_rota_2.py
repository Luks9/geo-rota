"""
Seed de teste para validação de rotas mais curtas,
mantendo a mesma empresa GEO001 e adicionando indisponibilidades de funcionários.
"""
from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from geo_rota.core.database import SessionLocal, engine
from geo_rota.core.security import get_password_hash
from geo_rota.models import (
    DestinoRota,
    DisponibilidadeVeiculo,
    Empresa,
    EscalaTrabalho,
    Funcionario,
    FuncionarioGrupoRota,
    GrupoRota,
    IndisponibilidadeFuncionario,
    Usuario,
    Veiculo,
)
from geo_rota.models.cache import CacheGeocodificacao
from geo_rota.models.enums import (
    CategoriaCustoVeiculo,
    RegimeRotaEnum,
    RoleEnum,
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


COORDS_FUNCIONARIOS_TESTE = {
    "101.202.303-00": (-5.8251, -35.2057),
    "202.303.404-00": (-5.7994, -35.2038),
    "303.404.505-00": (-5.8785, -35.1944),
    "404.505.606-00": (-5.7950, -35.2227),
    "505.606.707-00": (-5.9321, -35.2465),
}
COORDS_DESTINO_PADRAO = (-5.8278546, -35.2062241)


# -----------------------------
# Função utilitária genérica
# -----------------------------
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


# -----------------------------
# Seeds
# -----------------------------
def seed_usuario_admin(session: Session) -> Usuario:
    admin_email = "admin@geo-rota.local"
    usuario = session.query(Usuario).filter_by(email=admin_email).first()
    if usuario:
        return usuario

    usuario = Usuario(
        nome="Administrador GeoRota",
        email=admin_email,
        hashed_password=get_password_hash("admin123"),
        role=RoleEnum.ADMIN,
        is_active=True,
    )
    session.add(usuario)
    session.flush()
    return usuario


def seed_empresa(session: Session) -> Empresa:
    empresa = session.query(Empresa).filter_by(codigo="GEO001").first()
    if not empresa:
        raise RuntimeError("Empresa GEO001 nao encontrada. Execute o seed principal antes.")
    return empresa


def seed_destino_base(session: Session, empresa: Empresa) -> DestinoRota:
    destino = (
        session.query(DestinoRota)
        .filter(DestinoRota.empresa_id == empresa.id)
        .order_by(DestinoRota.id.asc())
        .first()
    )
    if destino:
        return destino

    partes_endereco = empresa.endereco_base.split(",", 1)
    logradouro = partes_endereco[0].strip()
    numero = partes_endereco[1].strip() if len(partes_endereco) > 1 else "S/N"
    destino = DestinoRota(
        empresa_id=empresa.id,
        nome=f"{empresa.nome} - Base",
        logradouro=logradouro,
        numero=numero,
        bairro="Lagoa Nova",
        cidade=empresa.cidade,
        estado=empresa.estado,
        cep=empresa.cep,
        latitude=COORDS_DESTINO_PADRAO[0],
        longitude=COORDS_DESTINO_PADRAO[1],
        ativo=True,
    )
    session.add(destino)
    session.flush()
    return destino


def seed_funcionarios(session: Session, empresa: Empresa) -> list[Funcionario]:
    colaboradores = [
        {
            "nome_completo": "Lucas Pereira",
            "cpf": "101.202.303-00",
            "email": "lucas.pereira@georota.dev",
            "telefone": "84999991111",
            "logradouro": "Av. Prudente de Morais",
            "numero": "3500",
            "bairro": "Lagoa Nova",
            "cidade": "Natal",
            "estado": "RN",
            "cep": "59064-620",
            "possui_cnh": True,
            "categoria_cnh": "B",
            "apto_dirigir": True,
        },
        {
            "nome_completo": "Mariana Gomes",
            "cpf": "202.303.404-00",
            "email": "mariana.gomes@georota.dev",
            "telefone": "84999992222",
            "logradouro": "Rua Trairi",
            "numero": "250",
            "bairro": "Petrópolis",
            "cidade": "Natal",
            "estado": "RN",
            "cep": "59012-450",
            "possui_cnh": False,
            "apto_dirigir": False,
        },
        {
            "nome_completo": "Renato Silva",
            "cpf": "303.404.505-00",
            "email": "renato.silva@georota.dev",
            "telefone": "84999993333",
            "logradouro": "Av. Ayrton Senna",
            "numero": "2900",
            "bairro": "Neópolis",
            "cidade": "Natal",
            "estado": "RN",
            "cep": "59080-100",
            "possui_cnh": True,
            "categoria_cnh": "B",
            "apto_dirigir": True,
        },
        {
            "nome_completo": "Carolina Dias",
            "cpf": "404.505.606-00",
            "email": "carolina.dias@georota.dev",
            "telefone": "84999994444",
            "logradouro": "Rua João XXIII",
            "numero": "400",
            "bairro": "Alecrim",
            "cidade": "Natal",
            "estado": "RN",
            "cep": "59037-240",
            "possui_cnh": False,
            "apto_dirigir": False,
        },
        {
            "nome_completo": "Eduardo Nascimento",
            "cpf": "505.606.707-00",
            "email": "eduardo.nascimento@georota.dev",
            "telefone": "84999995555",
            "logradouro": "Av. Tenente Lourival de Melo Mota",
            "numero": "1000",
            "bairro": "Emaús",
            "cidade": "Parnamirim",
            "estado": "RN",
            "cep": "59148-000",
            "possui_cnh": True,
            "categoria_cnh": "B",
            "apto_dirigir": True,
        },
    ]

    funcionarios = []
    for dados in colaboradores:
        f, _ = get_or_create(
            session,
            Funcionario,
            empresa_id=empresa.id,
            cpf=dados["cpf"],
            defaults=dados,
        )
        funcionarios.append(f)

    session.commit()
    return funcionarios


def seed_escalas(session: Session, funcionarios):
    for f in funcionarios:
        for dia in range(0, 5):  # segunda a sexta
            get_or_create(
                session,
                EscalaTrabalho,
                funcionario_id=f.id,
                dia_semana=dia,
                turno=TurnoTrabalhoEnum.MANHA,
                defaults={"disponivel": True},
            )
    session.commit()


def seed_grupo(session: Session, empresa: Empresa):
    grupo, _ = get_or_create(
        session,
        GrupoRota,
        empresa_id=empresa.id,
        nome="Rotina Semanal - Teste Rotas",
        defaults={
            "tipo_regime": RegimeRotaEnum.DIARIO,
            "dias_semana_padrao": [0, 1, 2, 3, 4],
            "descricao": "Grupo para teste de cálculo de rotas com indisponibilidades",
        },
    )
    return grupo


def seed_vinculos(session: Session, grupo, funcionarios):
    for f in funcionarios:
        get_or_create(
            session,
            FuncionarioGrupoRota,
            funcionario_id=f.id,
            grupo_rota_id=grupo.id,
        )
    session.commit()


def seed_veiculos(session: Session, empresa: Empresa):
    veiculos_dados = [
        {
            "placa": "GEO-1111",
            "tipo": "Econômico",
            "capacidade_passageiros": 4,
            "consumo_medio_km_l": 13.0,
            "categoria_custo": CategoriaCustoVeiculo.BAIXO,
        },
        {
            "placa": "GEO-2222",
            "tipo": "Sedan",
            "capacidade_passageiros": 5,
            "consumo_medio_km_l": 10.0,
            "categoria_custo": CategoriaCustoVeiculo.MEDIO,
        },
        {
            "placa": "GEO-3333",
            "tipo": "Van",
            "capacidade_passageiros": 8,
            "consumo_medio_km_l": 8.5,
            "categoria_custo": CategoriaCustoVeiculo.ALTO,
        },
    ]
    veiculos = []
    for dados in veiculos_dados:
        v, _ = get_or_create(session, Veiculo, empresa_id=empresa.id, placa=dados["placa"], defaults=dados)
        veiculos.append(v)
    session.commit()
    return veiculos


def seed_disponibilidades(session: Session, grupo, veiculos):
    hoje = date.today()
    fim = hoje + timedelta(days=30)
    for v in veiculos:
        get_or_create(
            session,
            DisponibilidadeVeiculo,
            veiculo_id=v.id,
            inicio_periodo=hoje,
            fim_periodo=fim,
            defaults={
                "tipo": TipoDisponibilidadeVeiculoEnum.FIXO,
                "dias_semana": "0,1,2,3,4",
                "renovacao_mensal": True,
                "grupo_rota_id": grupo.id,
                "observacoes": "Disponibilidade inicial para teste de rotas",
            },
        )
    session.commit()


def seed_indisponibilidades(session: Session, funcionarios):
    """
    Marca um dos funcionários como indisponível (ex: férias) por 1 semana.
    """
    hoje = date.today()
    funcionario_alvo = funcionarios[1] if len(funcionarios) > 1 else funcionarios[0]

    get_or_create(
        session,
        IndisponibilidadeFuncionario,
        funcionario_id=funcionario_alvo.id,
        data_inicio=hoje + timedelta(days=3),
        data_fim=hoje + timedelta(days=10),
        defaults={
            "tipo": TipoIndisponibilidadeEnum.FERIAS,
            "motivo": "Férias programadas para testes de rota",
        },
    )
    session.commit()


def seed_cache_geocodificacao(
    session: Session,
    funcionarios: list[Funcionario],
    destino: Optional[DestinoRota],
) -> None:
    for funcionario in funcionarios:
        coordenadas = COORDS_FUNCIONARIOS_TESTE.get(funcionario.cpf)
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
        lat = destino.latitude if destino.latitude is not None else COORDS_DESTINO_PADRAO[0]
        lon = destino.longitude if destino.longitude is not None else COORDS_DESTINO_PADRAO[1]
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


# -----------------------------
# Execução principal
# -----------------------------
def run_seed():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        seed_usuario_admin(session)
        empresa = seed_empresa(session)
        destino = seed_destino_base(session, empresa)
        funcionarios = seed_funcionarios(session, empresa)
        seed_escalas(session, funcionarios)
        grupo = seed_grupo(session, empresa)
        seed_vinculos(session, grupo, funcionarios)
        veiculos = seed_veiculos(session, empresa)
        seed_disponibilidades(session, grupo, veiculos)
        seed_indisponibilidades(session, funcionarios)
        seed_cache_geocodificacao(session, funcionarios, destino)
        session.commit()
        print(
            "Base de dados atualizada! Login admin@geo-rota.local / admin123. Use /rotas/gerar ou /rotas/gerar-vrp para validar rotas."
        )
    except Exception as exc:
        session.rollback()
        raise RuntimeError("Falha ao popular base de dados") from exc
    finally:
        session.close()


if __name__ == "__main__":
    run_seed()

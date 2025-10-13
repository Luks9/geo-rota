"""
Seed de teste para validação de rotas mais curtas,
mantendo a mesma empresa GEO001 e adicionando indisponibilidades de funcionários.
"""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from geo_rota.core.database import SessionLocal, engine
from geo_rota.models import (
    Empresa,
    Funcionario,
    EscalaTrabalho,
    GrupoRota,
    FuncionarioGrupoRota,
    Veiculo,
    DisponibilidadeVeiculo,
    IndisponibilidadeFuncionario,
)
from geo_rota.models.enums import (
    TurnoTrabalhoEnum,
    RegimeRotaEnum,
    CategoriaCustoVeiculo,
    TipoDisponibilidadeVeiculoEnum,
    TipoIndisponibilidadeEnum,
)
from geo_rota.models.model_base import Base


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
def seed_empresa(session: Session) -> Empresa:
    empresa = session.query(Empresa).filter_by(codigo="GEO001").first()
    if not empresa:
        raise RuntimeError("Empresa GEO001 não encontrada. Execute o seed principal antes.")
    return empresa


def seed_funcionarios(session: Session, empresa: Empresa) -> list[Funcionario]:
    colaboradores = [
        {
            "nome_completo": "Lucas Pereira",
            "cpf": "101.202.303-00",
            "email": "lucas.pereira@example.com",
            "telefone": "11999991111",
            "logradouro": "Av. do Estado",
            "numero": "5000",
            "bairro": "Cambuci",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "01516-000",
            "possui_cnh": True,
            "categoria_cnh": "B",
            "apto_dirigir": True,
        },
        {
            "nome_completo": "Mariana Gomes",
            "cpf": "202.303.404-00",
            "email": "mariana.gomes@example.com",
            "telefone": "11999992222",
            "logradouro": "Av. Interlagos",
            "numero": "2500",
            "bairro": "Interlagos",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "04661-200",
            "possui_cnh": False,
            "apto_dirigir": False,
        },
        {
            "nome_completo": "Renato Silva",
            "cpf": "303.404.505-00",
            "email": "renato.silva@example.com",
            "telefone": "11999993333",
            "logradouro": "Rua Voluntários da Pátria",
            "numero": "2000",
            "bairro": "Santana",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "02010-000",
            "possui_cnh": True,
            "categoria_cnh": "B",
            "apto_dirigir": True,
        },
        {
            "nome_completo": "Carolina Dias",
            "cpf": "404.505.606-00",
            "email": "carolina.dias@example.com",
            "telefone": "11999994444",
            "logradouro": "Av. Sapopemba",
            "numero": "8000",
            "bairro": "Sapopemba",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "03345-000",
            "possui_cnh": False,
            "apto_dirigir": False,
        },
        {
            "nome_completo": "Eduardo Nascimento",
            "cpf": "505.606.707-00",
            "email": "eduardo.nascimento@example.com",
            "telefone": "11999995555",
            "logradouro": "Av. Francisco Morato",
            "numero": "4500",
            "bairro": "Butantã",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "05512-300",
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
            "dia_semana_padrao": 0,
            "descricao": "Grupo para teste de cálculo de rotas com indisponibilidades",
        },
    )
    return grupo


def seed_vinculos(session: Session, grupo, funcionarios):
    for f in funcionarios:
        for dia in range(0, 5):
            get_or_create(
                session,
                FuncionarioGrupoRota,
                funcionario_id=f.id,
                grupo_rota_id=grupo.id,
                dia_semana=dia,
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


# -----------------------------
# Execução principal
# -----------------------------
def run_seed():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        empresa = seed_empresa(session)
        funcionarios = seed_funcionarios(session, empresa)
        seed_escalas(session, funcionarios)
        grupo = seed_grupo(session, empresa)
        seed_vinculos(session, grupo, funcionarios)
        veiculos = seed_veiculos(session, empresa)
        seed_disponibilidades(session, grupo, veiculos)
        seed_indisponibilidades(session, funcionarios)
        session.commit()
        print("✅ Base de dados atualizada! Use /rotas/gerar para validar rotas e indisponibilidades.")
    except Exception as exc:
        session.rollback()
        raise RuntimeError("Falha ao popular base de dados") from exc
    finally:
        session.close()


if __name__ == "__main__":
    run_seed()

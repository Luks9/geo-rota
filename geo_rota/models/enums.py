from enum import Enum


class TurnoTrabalhoEnum(str, Enum):
    MANHA = "manha"
    TARDE = "tarde"
    NOITE = "noite"


class RegimeRotaEnum(str, Enum):
    DIARIO = "diario"
    EMBARQUE = "embarque"


class CategoriaCustoVeiculo(str, Enum):
    BAIXO = "baixo"
    MEDIO = "medio"
    ALTO = "alto"


class TipoDisponibilidadeVeiculoEnum(str, Enum):
    FIXO = "fixo"
    ALUGUEL = "aluguel"


class TipoIndisponibilidadeEnum(str, Enum):
    FERIAS = "ferias"
    ATESTADO = "atestado"
    HOME_OFFICE = "home_office"
    TREINAMENTO = "treinamento"
    OUTROS = "outros"


class StatusRotaEnum(str, Enum):
    RASCUNHO = "rascunho"
    AGENDADA = "agendada"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDA = "concluida"
    CANCELADA = "cancelada"


class PapelAtribuicaoRota(str, Enum):
    MOTORISTA = "motorista"
    PASSAGEIRO = "passageiro"
    RESERVA = "reserva"


class ModoAlgoritmoEnum(str, Enum):
    MANUAL = "manual"
    AUTOMATICO = "automatico"


class RoleEnum(str, Enum):
    ADMIN = "admin"
    USER = "user"

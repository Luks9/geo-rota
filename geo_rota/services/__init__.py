from geo_rota.services.empresa_service import (  # noqa: F401
    atualizar_empresa,
    criar_empresa,
    listar_empresas,
    obter_empresa,
    remover_empresa,
)
from geo_rota.services.destino_service import (  # noqa: F401
    atualizar_destino,
    criar_destino,
    listar_destinos,
    obter_destino,
    remover_destino,
)
from geo_rota.services.funcionario_service import (  # noqa: F401
    adicionar_escala_trabalho,
    atualizar_indisponibilidade,
    atualizar_escala_trabalho,
    atualizar_funcionario,
    criar_funcionario,
    cadastrar_indisponibilidade,
    inativar_funcionario,
    listar_indisponibilidades,
    listar_funcionarios,
    obter_funcionario,
    remover_indisponibilidade,
    remover_escala_trabalho,
)
from geo_rota.services.grupo_rota_service import (  # noqa: F401
    atualizar_grupo_rota,
    criar_grupo_rota,
    listar_grupos_rota,
    obter_grupo_rota,
    remover_grupo_rota,
    remover_vinculo_funcionario_grupo,
    vincular_funcionario_grupo,
)
from geo_rota.services.rota_service import (  # noqa: F401
    atribuir_funcionario,
    atualizar_rota,
    criar_rota,
    listar_rotas,
    obter_rota,
    registrar_funcionario_pendente,
    registrar_log_administrativo,
    registrar_log_erro,
    registrar_log_geracao,
    remover_atribuicao,
    remover_funcionario_pendente,
    remover_rota,
    atualizar_motorista_rota,
    atualizar_veiculo_rota,
    atualizar_destino_rota,
    atualizar_data_turno_rota,
    atualizar_status_rota,
    atualizar_funcionarios_rota,
    remanejar_funcionarios_entre_rotas,
    recalcular_rota,
)
from geo_rota.services.roteirizacao_service import gerar_rota_automatica, gerar_rotas_vrp  # noqa: F401
from geo_rota.services.veiculo_service import (  # noqa: F401
    atualizar_disponibilidade,
    atualizar_veiculo,
    cadastrar_disponibilidade,
    criar_veiculo,
    listar_disponibilidades,
    listar_veiculos,
    obter_veiculo,
    remover_disponibilidade,
    remover_veiculo,
)
from geo_rota.services.user_service import (  # noqa: F401
    authenticate_user,
    create_user,
    get_user_by_email,
    get_user_by_id,
    update_user,
)

import api from '../../../api/apiClient'

export type Funcionario = {
  id: number
  empresa_id: number
  nome_completo: string
  cpf: string
  email: string | null
  telefone: string | null
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  estado: string
  cep: string
  possui_cnh: boolean
  categoria_cnh: string | null
  cnh_valida_ate: string | null
  apto_dirigir: boolean
  ativo: boolean
  grupos_rota?: FuncionarioGrupoRota[]
}

export type EscalaTrabalho = {
  id: number
  funcionario_id: number
  dia_semana: number
  turno: string
  disponivel: boolean
  hora_inicio: string | null
  hora_fim: string | null
}

export type EscalaTrabalhoInput = {
  dia_semana: number
  turno: string
  disponivel: boolean
  hora_inicio: string | null
  hora_fim: string | null
}

export type IndisponibilidadeFuncionario = {
  id: number
  funcionario_id: number
  tipo: string
  motivo: string | null
  data_inicio: string
  data_fim: string
}

export type FuncionarioGrupoRota = {
  id: number
  funcionario_id: number
  grupo_rota_id: number
  grupo_nome?: string | null
}

export type FuncionarioGrupoRotaInput = {
  grupo_rota_id: number
}

export type FuncionarioDetalhado = Funcionario & {
  escalas_trabalho: EscalaTrabalho[]
  indisponibilidades: IndisponibilidadeFuncionario[]
  grupos_rota: FuncionarioGrupoRota[]
}

export type FuncionarioCreatePayload = Omit<Funcionario, 'id'> & {
  ativo?: boolean
  escalas_trabalho?: EscalaTrabalhoInput[]
  grupos_rota?: FuncionarioGrupoRotaInput[]
}

export type FuncionarioUpdatePayload = Partial<{
  nome_completo: string
  email: string | null
  telefone: string | null
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  estado: string
  cep: string
  possui_cnh: boolean
  categoria_cnh: string | null
  cnh_valida_ate: string | null
  apto_dirigir: boolean
  ativo: boolean
  escalas_trabalho: EscalaTrabalhoInput[]
  grupos_rota: FuncionarioGrupoRotaInput[]
}>

export type FuncionarioListParams = {
  empresaId?: number
}

const mapEscalaPayload = (escala: EscalaTrabalhoInput) => ({
  dia_semana: escala.dia_semana,
  turno: escala.turno,
  disponivel: escala.disponivel,
  hora_inicio: escala.hora_inicio ?? null,
  hora_fim: escala.hora_fim ?? null,
})

const mapGrupoRotaPayload = (grupo: FuncionarioGrupoRotaInput) => ({
  grupo_rota_id: grupo.grupo_rota_id,
})

const mapCreatePayload = (payload: FuncionarioCreatePayload) => {
  const body: Record<string, unknown> = { ...payload }
  body.email = payload.email ?? null
  body.telefone = payload.telefone ?? null
  body.complemento = payload.complemento ?? null
  body.categoria_cnh = payload.categoria_cnh ?? null
  body.cnh_valida_ate = payload.cnh_valida_ate ?? null
  body.ativo = payload.ativo ?? true
  body.escalas_trabalho = (payload.escalas_trabalho ?? []).map(mapEscalaPayload)
  body.grupos_rota = (payload.grupos_rota ?? []).map(mapGrupoRotaPayload)
  return body
}

const mapUpdatePayload = (payload: FuncionarioUpdatePayload) => {
  const body: Record<string, unknown> = {}

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key === 'escalas_trabalho' && Array.isArray(value)) {
        body[key] = value.map(mapEscalaPayload)
      } else if (key === 'grupos_rota' && Array.isArray(value)) {
        body[key] = value.map(mapGrupoRotaPayload)
      } else {
        body[key] = value
      }
    }
  })

  return body
}

export const funcionarioService = {
  async listar(params?: FuncionarioListParams): Promise<Funcionario[]> {
    const { data } = await api.get<Funcionario[]>('/funcionarios', {
      params: params?.empresaId ? { empresa_id: params.empresaId } : undefined,
    })
    return data
  },

  async obter(id: number): Promise<FuncionarioDetalhado> {
    const { data } = await api.get<FuncionarioDetalhado>(`/funcionarios/${id}`)
    return data
  },

  async criar(payload: FuncionarioCreatePayload): Promise<FuncionarioDetalhado> {
    const { data } = await api.post<FuncionarioDetalhado>('/funcionarios', mapCreatePayload(payload))
    return data
  },

  async atualizar(id: number, payload: FuncionarioUpdatePayload): Promise<FuncionarioDetalhado> {
    const { data } = await api.put<FuncionarioDetalhado>(`/funcionarios/${id}`, mapUpdatePayload(payload))
    return data
  },

  async desativar(id: number): Promise<void> {
    await api.delete(`/funcionarios/${id}`)
  },
}

export default funcionarioService

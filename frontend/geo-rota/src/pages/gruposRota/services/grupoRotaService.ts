import api from '../../../api/apiClient'

export type GrupoRota = {
  id: number
  empresa_id: number
  nome: string
  tipo_regime: 'diario' | 'embarque'
  dias_semana_padrao: number[]
  descricao: string | null
}

export type GrupoRotaCreatePayload = {
  empresa_id: number
  nome: string
  tipo_regime: 'diario' | 'embarque'
  dias_semana_padrao: number[]
  descricao: string | null
}

export type GrupoRotaUpdatePayload = Partial<{
  nome: string
  tipo_regime: 'diario' | 'embarque'
  dias_semana_padrao: number[]
  descricao: string | null
}>

export type GrupoRotaListParams = {
  empresaId?: number
}

const normalizePayload = (payload: GrupoRotaCreatePayload | GrupoRotaUpdatePayload) => {
  const body: Record<string, unknown> = {}
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) {
      body[key] = value
    }
  })
  return body
}

const grupoRotaService = {
  async listar(params?: GrupoRotaListParams): Promise<GrupoRota[]> {
    const { data } = await api.get<GrupoRota[]>('/grupos-rota', {
      params: params?.empresaId ? { empresa_id: params.empresaId } : undefined,
    })
    return data
  },

  async obter(id: number): Promise<GrupoRota> {
    const { data } = await api.get<GrupoRota>(`/grupos-rota/${id}`)
    return data
  },

  async criar(payload: GrupoRotaCreatePayload): Promise<GrupoRota> {
    const { data } = await api.post<GrupoRota>('/grupos-rota', normalizePayload(payload))
    return data
  },

  async atualizar(id: number, payload: GrupoRotaUpdatePayload): Promise<GrupoRota> {
    const { data } = await api.put<GrupoRota>(`/grupos-rota/${id}`, normalizePayload(payload))
    return data
  },

  async remover(id: number): Promise<void> {
    await api.delete(`/grupos-rota/${id}`)
  },
}

export default grupoRotaService

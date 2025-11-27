import api from '../../../api/apiClient'
import type { RotaGerada } from '../../rotasAutomaticas/services/rotaAutomaticaService'

export type Rota = RotaGerada

export type RotaListParams = {
  empresaId?: number
  dataReferencia?: string
}

export type RotaUpdatePayload = {
  status?: Rota['status']
}

export const rotaService = {
  async listar(params?: RotaListParams): Promise<Rota[]> {
    const { data } = await api.get<Rota[]>('/rotas', {
      params: {
        empresa_id: params?.empresaId,
        data_referencia: params?.dataReferencia,
      },
    })
    return data
  },

  async obter(id: number): Promise<Rota> {
    const { data } = await api.get<Rota>(`/rotas/${id}`)
    return data
  },

  async atualizar(id: number, payload: RotaUpdatePayload): Promise<Rota> {
    const { data } = await api.put<Rota>(`/rotas/${id}`, payload)
    return data
  },

  async remover(id: number): Promise<void> {
    await api.delete(`/rotas/${id}`)
  },
}

export default rotaService

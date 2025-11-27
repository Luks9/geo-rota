import api from '../../../api/apiClient'

export type DestinoRota = {
  id: number
  empresa_id: number
  nome: string
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  estado: string
  cep: string
  ativo: boolean
}

export type DestinoListParams = {
  empresaId?: number
  apenasAtivos?: boolean
}

export const destinoService = {
  async listar(params?: DestinoListParams): Promise<DestinoRota[]> {
    const { data } = await api.get<DestinoRota[]>('/destinos', {
      params: {
        empresa_id: params?.empresaId,
        apenas_ativos: params?.apenasAtivos ?? true,
      },
    })
    return data
  },
}

export default destinoService

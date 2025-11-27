import api from '../../../api/apiClient'

export type Veiculo = {
  id: number
  empresa_id: number
  placa: string
  tipo: string
  capacidade_passageiros: number
  consumo_medio_km_l: number
  categoria_custo: 'baixo' | 'medio' | 'alto'
  ativo: boolean
}

export type VeiculoListParams = {
  empresaId?: number
  apenasAtivos?: boolean
}

export const veiculoService = {
  async listar(params?: VeiculoListParams): Promise<Veiculo[]> {
    const { data } = await api.get<Veiculo[]>('/veiculos', {
      params: {
        empresa_id: params?.empresaId,
        apenas_ativos: params?.apenasAtivos ?? true,
      },
    })
    return data
  },
}

export default veiculoService

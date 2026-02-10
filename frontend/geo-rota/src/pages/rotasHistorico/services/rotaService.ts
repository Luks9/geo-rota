import api from '../../../api/apiClient'
import type { AtribuicaoRota, RotaGerada } from '../../rotasAutomaticas/services/rotaAutomaticaService'

export type Rota = RotaGerada

export type RotaListParams = {
  empresaId?: number
  dataReferencia?: string
}

export type AtualizarStatusPayload = {
  status: Rota['status']
}

export type AtualizarMotoristaPayload = {
  motorista_id: number | null
}

export type AtualizarVeiculoPayload = {
  veiculo_id: number | null
  disponibilidade_veiculo_id?: number | null
}

export type AtualizarDestinoPayload = {
  destino_id: number | null
  destino_nome?: string | null
  destino_logradouro?: string | null
  destino_numero?: string | null
  destino_complemento?: string | null
  destino_bairro?: string | null
  destino_cidade?: string | null
  destino_estado?: string | null
  destino_cep?: string | null
}

export type AtualizarDataTurnoPayload = {
  data_agendada: string
  turno: Rota['turno']
}

export type FuncionarioRotaEdicaoPayload = {
  funcionario_id: number
  papel: AtribuicaoRota['papel']
  ordem_embarque?: number | null
}

export type AtualizarFuncionariosPayload = {
  atribuicoes: FuncionarioRotaEdicaoPayload[]
}

export type RemanejamentoPayload = {
  rota_origem_id: number
  rota_destino_id: number
  funcionarios_ids: number[]
}

export type RecalcularRotaPayload = {
  motivo?: string | null
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

  async atualizarStatus(id: number, payload: AtualizarStatusPayload): Promise<Rota> {
    const { data } = await api.post<Rota>(`/rotas/${id}/status`, payload)
    return data
  },

  async atualizarMotorista(id: number, payload: AtualizarMotoristaPayload): Promise<Rota> {
    const { data } = await api.post<Rota>(`/rotas/${id}/motorista`, payload)
    return data
  },

  async atualizarVeiculo(id: number, payload: AtualizarVeiculoPayload): Promise<Rota> {
    const { data } = await api.post<Rota>(`/rotas/${id}/veiculo`, payload)
    return data
  },

  async atualizarDestino(id: number, payload: AtualizarDestinoPayload): Promise<Rota> {
    const { data } = await api.post<Rota>(`/rotas/${id}/destino`, payload)
    return data
  },

  async atualizarDataTurno(id: number, payload: AtualizarDataTurnoPayload): Promise<Rota> {
    const { data } = await api.post<Rota>(`/rotas/${id}/data-turno`, payload)
    return data
  },

  async atualizarFuncionarios(id: number, payload: AtualizarFuncionariosPayload): Promise<Rota> {
    const { data } = await api.post<Rota>(`/rotas/${id}/funcionarios`, payload)
    return data
  },

  async remanejarFuncionarios(payload: RemanejamentoPayload): Promise<Rota[]> {
    const { data } = await api.post<Rota[]>('/rotas/remanejamentos', payload)
    return data
  },

  async recalcular(id: number, payload: RecalcularRotaPayload): Promise<Rota> {
    const { data } = await api.post<Rota>(`/rotas/${id}/recalcular`, payload)
    return data
  },

  async remover(id: number): Promise<void> {
    await api.delete(`/rotas/${id}`)
  },
}

export default rotaService

import api from '../../../api/apiClient'

export type TurnoTrabalho = 'manha' | 'tarde' | 'noite'

export type SugestaoVeiculoExtra = {
  tipo: string
  quantidade: number
  capacidade_por_veiculo: number
  passageiros_atendidos: number
}

export type DestinoResumo = {
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
  latitude: number | null
  longitude: number | null
}

export type AtribuicaoRota = {
  id: number
  rota_id: number
  funcionario_id: number
  papel: 'motorista' | 'passageiro' | 'reserva'
  ordem_embarque: number | null
  hora_embarque: string | null
  latitude: number | null
  longitude: number | null
}

export type GerarRotaPayload = {
  empresa_id: number
  grupo_rota_id: number
  data_agendada: string
  turno: TurnoTrabalho
  motorista_id?: number | null
  veiculo_id?: number | null
  modo_geracao?: 'automatico'
  destino_id?: number | null
  destino_nome?: string | null
  destino_logradouro?: string | null
  destino_numero?: string | null
  destino_complemento?: string | null
  destino_bairro?: string | null
  destino_cidade?: string | null
  destino_estado?: string | null
  destino_cep?: string | null
}

export type RotaGerada = {
  id: number
  empresa_id: number
  grupo_rota_id: number
  data_agendada: string
  turno: TurnoTrabalho
  status: 'rascunho' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'
  modo_geracao: 'automatico' | 'manual'
  motorista_id: number | null
  veiculo_id: number | null
  destino_id: number | null
  destino: DestinoResumo | null
  atribuicoes: AtribuicaoRota[]
  observacoes: string | null
  sugestoes_veiculos: SugestaoVeiculoExtra[]
  distancia_total_km?: number | null
  custo_operacional_total?: number | null
}

export const rotaAutomaticaService = {
  async gerarSimples(payload: GerarRotaPayload): Promise<RotaGerada> {
    const { data } = await api.post<RotaGerada>('/rotas/gerar', payload)
    return data
  },

  async gerarVRP(payload: GerarRotaPayload): Promise<RotaGerada[]> {
    const { data } = await api.post<RotaGerada[]>('/rotas/gerar-vrp', payload)
    return data
  },
}

export default rotaAutomaticaService

import api from '../../../api/apiClient'

export type Empresa = {
  id: number
  codigo: string
  nome: string
  endereco_base: string
  cidade: string
  estado: string
  cep: string
}

export const empresaService = {
  async listar(): Promise<Empresa[]> {
    const { data } = await api.get<Empresa[]>('/empresas')
    return data
  },
}

export default empresaService

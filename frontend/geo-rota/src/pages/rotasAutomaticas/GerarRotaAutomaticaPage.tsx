import { AxiosError } from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

import { useNotification } from '../../hooks/useNotification'
import empresaService, { type Empresa } from '../funcionarios/services/empresaService'
import funcionarioService, { type Funcionario } from '../funcionarios/services/funcionarioService'
import grupoRotaService, { type GrupoRota } from '../gruposRota/services/grupoRotaService'
import destinoService, { type DestinoRota } from './services/destinoService'
import RouteDetails from './components/RouteDetails'
import RouteForm, { type FormErrors, type FormValues } from './components/RouteForm'
import RouteMap from './components/RouteMap'
import rotaAutomaticaService, {
  type AtribuicaoRota,
  type GerarRotaPayload,
  type RotaGerada,
  type SugestaoVeiculoExtra,
  type TurnoTrabalho,
} from './services/rotaAutomaticaService'
import veiculoService, { type Veiculo } from './services/veiculoService'

type ApiErrorResponse =
  | string
  | {
      detail?: string
      mensagem?: string
      sugestoes?: SugestaoVeiculoExtra[]
    }

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const TURNO_OPTIONS: { value: TurnoTrabalho; label: string }[] = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
]

const hojeISO = new Date().toISOString().split('T')[0]
const ROTA_COLORS = ['#3273dc', '#e76f51', '#2a9d8f', '#f4a261', '#9b5de5', '#219ebc']

const defaultValues: FormValues = {
  empresaId: '',
  grupoRotaId: '',
  dataAgendada: hojeISO,
  turno: 'manha',
  modoGeracao: 'vrp',
  motoristaId: '',
  veiculoId: '',
  usarDestinoManual: false,
  destinoId: '',
  destinoNome: '',
  destinoLogradouro: '',
  destinoNumero: '',
  destinoComplemento: '',
  destinoBairro: '',
  destinoCidade: '',
  destinoEstado: '',
  destinoCep: '',
}

type RotaVisualizacao = {
  rota: RotaGerada
  atribuicoesOrdenadas: AtribuicaoRota[]
  color: string
}

function GerarRotaAutomaticaPage() {
  const { danger, success } = useNotification()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [grupos, setGrupos] = useState<GrupoRota[]>([])
  const [motoristas, setMotoristas] = useState<Funcionario[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [destinos, setDestinos] = useState<DestinoRota[]>([])
  const [rotasGeradas, setRotasGeradas] = useState<RotaGerada[]>([])
  const [sugestoesErro, setSugestoesErro] = useState<SugestaoVeiculoExtra[]>([])
  const [erroGeracao, setErroGeracao] = useState<string | null>(null)
  const [values, setValues] = useState<FormValues>(defaultValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loadingEmpresas, setLoadingEmpresas] = useState(true)
  const [loadingDependencias, setLoadingDependencias] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const funcionariosPorId = useMemo(() => {
    const map = new Map<number, Funcionario>()
    motoristas.forEach((func) => map.set(func.id, func))
    return map
  }, [motoristas])

  const motoristasElegiveis = useMemo(
    () => motoristas.filter((func) => func.apto_dirigir && func.possui_cnh && func.ativo),
    [motoristas],
  )

  const gruposDisponiveis = useMemo(() => {
    if (!values.empresaId) return []
    const empresaId = Number(values.empresaId)
    return grupos.filter((grupo) => grupo.empresa_id === empresaId)
  }, [grupos, values.empresaId])

  const veiculosDisponiveis = useMemo(() => {
    if (!values.empresaId) return []
    const empresaId = Number(values.empresaId)
    return veiculos.filter((veiculo) => veiculo.empresa_id === empresaId && veiculo.ativo)
  }, [values.empresaId, veiculos])

  const veiculosPorId = useMemo(() => {
    const map = new Map<number, Veiculo>()
    veiculos.forEach((veiculo) => map.set(veiculo.id, veiculo))
    return map
  }, [veiculos])

  const destinosDisponiveis = useMemo(() => {
    if (!values.empresaId) return []
    const empresaId = Number(values.empresaId)
    return destinos.filter((destino) => destino.empresa_id === empresaId && destino.ativo)
  }, [destinos, values.empresaId])
  const rotasParaVisualizacao = useMemo<RotaVisualizacao[]>(() => {
    return rotasGeradas.map((rota, index) => {
      const atribuicoesOrdenadas = [...rota.atribuicoes].sort((a, b) => {
        if (a.ordem_embarque == null && b.ordem_embarque == null) return 0
        if (a.ordem_embarque == null) return 1
        if (b.ordem_embarque == null) return -1
        return a.ordem_embarque - b.ordem_embarque
      })
      return {
        rota,
        atribuicoesOrdenadas,
        color: ROTA_COLORS[index % ROTA_COLORS.length],
      }
    })
  }, [rotasGeradas])

  const carregarEmpresas = useCallback(async () => {
    setLoadingEmpresas(true)
    try {
      const lista = await empresaService.listar()
      setEmpresas(lista)
    } catch (error) {
      console.error(error)
      danger('Não foi possível carregar as empresas.')
    } finally {
      setLoadingEmpresas(false)
    }
  }, [danger])

  useEffect(() => {
    void carregarEmpresas()
  }, [carregarEmpresas])

  useEffect(() => {
    if (!values.empresaId) {
      setGrupos([])
      setMotoristas([])
      setVeiculos([])
      setDestinos([])
      return
    }

    const empresaId = Number(values.empresaId)
    setLoadingDependencias(true)
    Promise.all([
      grupoRotaService.listar({ empresaId }),
      funcionarioService.listar({ empresaId }),
      veiculoService.listar({ empresaId }),
      destinoService.listar({ empresaId }),
    ])
      .then(([gruposLista, funcionariosLista, veiculosLista, destinosLista]) => {
        setGrupos(gruposLista)
        setMotoristas(funcionariosLista)
        setVeiculos(veiculosLista)
        setDestinos(destinosLista)
      })
      .catch((error) => {
        console.error(error)
        danger('Falha ao carregar os dados da empresa selecionada.')
      })
      .finally(() => setLoadingDependencias(false))
  }, [danger, values.empresaId])

  useEffect(() => {
    if (values.usarDestinoManual) return
    if (!values.destinoId && destinos.length > 0) {
      setValues((prev) => ({ ...prev, destinoId: String(destinos[0].id) }))
    }
  }, [destinos, values.destinoId, values.usarDestinoManual])

  const handleFieldChange =
    (field: keyof FormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const target = event.target
      if (target instanceof HTMLInputElement && target.type === 'checkbox') {
        const nextValue = target.checked
        setValues((prev) => {
          if (field === 'usarDestinoManual' && !nextValue) {
            return {
              ...prev,
              usarDestinoManual: false,
              destinoNome: '',
              destinoLogradouro: '',
              destinoNumero: '',
              destinoComplemento: '',
              destinoBairro: '',
              destinoCidade: '',
              destinoEstado: '',
              destinoCep: '',
            }
          }
          return { ...prev, [field]: nextValue }
        })
        if (errors[field]) {
          setErrors((prev) => {
            const next = { ...prev }
            delete next[field]
            return next
          })
        }
        return
      }

      const fieldValue = target.value

      if (field === 'empresaId') {
        setValues((prev) => ({
          ...prev,
          empresaId: fieldValue,
          grupoRotaId: '',
          motoristaId: '',
          veiculoId: '',
          destinoId: '',
        }))
      } else if (field === 'destinoEstado') {
        setValues((prev) => ({ ...prev, destinoEstado: fieldValue.toUpperCase() }))
      } else {
        setValues((prev) => ({ ...prev, [field]: fieldValue }))
      }

      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev }
          delete next[field]
          return next
        })
      }
    }

  const sanitize = (texto: string) => texto.trim()

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {}
    if (!values.empresaId) {
      nextErrors.empresaId = 'Selecione a empresa.'
    }
    if (!values.grupoRotaId) {
      nextErrors.grupoRotaId = 'Selecione o grupo de rota.'
    }
    if (!values.dataAgendada) {
      nextErrors.dataAgendada = 'Informe a data desejada.'
    }
    if (!values.turno) {
      nextErrors.turno = 'Escolha o turno.'
    }
    if (values.usarDestinoManual) {
      if (!sanitize(values.destinoNome)) nextErrors.destinoNome = 'Informe o nome do destino.'
      if (!sanitize(values.destinoLogradouro)) nextErrors.destinoLogradouro = 'Informe o logradouro.'
      if (!sanitize(values.destinoNumero)) nextErrors.destinoNumero = 'Informe o número.'
      if (!sanitize(values.destinoBairro)) nextErrors.destinoBairro = 'Informe o bairro.'
      if (!sanitize(values.destinoCidade)) nextErrors.destinoCidade = 'Informe a cidade.'
      const estado = sanitize(values.destinoEstado)
      if (estado.length !== 2) nextErrors.destinoEstado = 'UF deve ter 2 letras.'
      const cep = sanitize(values.destinoCep)
      if (cep.length < 8) nextErrors.destinoCep = 'CEP inválido.'
    } else if (!values.destinoId) {
      nextErrors.destinoId = 'Selecione um destino ou marque a opção manual.'
    }
    return nextErrors
  }

  const formatarData = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('pt-BR')
    } catch {
      return iso
    }
  }

  const getTurnoLabel = (turno: TurnoTrabalho) =>
    TURNO_OPTIONS.find((option) => option.value === turno)?.label ?? turno

  const limparResultados = () => {
    setRotasGeradas([])
    setSugestoesErro([])
    setErroGeracao(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    limparResultados()
    setSubmitting(true)

    const payload: GerarRotaPayload = {
      empresa_id: Number(values.empresaId),
      grupo_rota_id: Number(values.grupoRotaId),
      data_agendada: values.dataAgendada,
      turno: values.turno,
      modo_geracao: 'automatico',
    }

    if (values.motoristaId) {
      payload.motorista_id = Number(values.motoristaId)
    }
    if (values.veiculoId) {
      payload.veiculo_id = Number(values.veiculoId)
    }
    if (!values.usarDestinoManual && values.destinoId) {
      payload.destino_id = Number(values.destinoId)
    }
    if (values.usarDestinoManual) {
      payload.destino_nome = sanitize(values.destinoNome)
      payload.destino_logradouro = sanitize(values.destinoLogradouro)
      payload.destino_numero = sanitize(values.destinoNumero)
      payload.destino_complemento = values.destinoComplemento ? sanitize(values.destinoComplemento) : null
      payload.destino_bairro = sanitize(values.destinoBairro)
      payload.destino_cidade = sanitize(values.destinoCidade)
      payload.destino_estado = sanitize(values.destinoEstado).toUpperCase()
      payload.destino_cep = sanitize(values.destinoCep)
    }

    try {
      let rotasResposta: RotaGerada[] = []
      if (values.modoGeracao === 'simples') {
        const rota = await rotaAutomaticaService.gerarSimples(payload)
        rotasResposta = rota ? [rota] : []
      } else {
        rotasResposta = await rotaAutomaticaService.gerarVRP(payload)
      }

      if (!rotasResposta.length) {
        danger('Nenhuma rota foi retornada pelo motor de roteirização.')
        setRotasGeradas([])
        return
      }

      setRotasGeradas(rotasResposta)
      const mensagem =
        rotasResposta.length > 1 ? `${rotasResposta.length} rotas geradas com sucesso!` : 'Rota gerada com sucesso!'
      success(mensagem)
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>
      const data = axiosError.response?.data
      let mensagemErro = 'Nao foi possivel gerar a rota automaticamente.'
      let sugestoes: SugestaoVeiculoExtra[] = []

      if (typeof data === 'string') {
        mensagemErro = data
      } else if (data) {
        if (typeof data.mensagem === 'string') {
          mensagemErro = data.mensagem
        } else if (typeof data.detail === 'string') {
          mensagemErro = data.detail
        }
        if (Array.isArray(data.sugestoes)) {
          sugestoes = data.sugestoes
        }
      }

      danger(mensagemErro)
      setErroGeracao(mensagemErro)
      setSugestoesErro(Array.isArray(sugestoes) ? sugestoes : [])
    } finally {
      setSubmitting(false)
    }
  }

  const renderSugestoes = (sugestoes: SugestaoVeiculoExtra[]) => {
    if (!sugestoes.length) return null
    return (
      <div className="table-container mt-3">
        <table className="table is-fullwidth is-striped">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Quantidade</th>
              <th>Capacidade por veículo</th>
              <th>Pessoas atendidas</th>
            </tr>
          </thead>
          <tbody>
            {sugestoes.map((item, index) => (
              <tr key={`${item.tipo}-${index}`}>
                <td>{item.tipo}</td>
                <td>{item.quantidade}</td>
                <td>{item.capacidade_por_veiculo}</td>
                <td>{item.passageiros_atendidos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <section className="section">
      <div className="level mb-4">
        <div className="level-left">
          <div>
            <h1 className="title is-4">Gerar rota automática</h1>
            <p className="subtitle is-6 has-text-grey">
              Utilize o motor de roteirização para montar rotas com base nas configurações da empresa.
            </p>
          </div>
        </div>
      </div>

      <RouteForm
        values={values}
        errors={errors}
        empresas={empresas}
        gruposDisponiveis={gruposDisponiveis}
        motoristasElegiveis={motoristasElegiveis}
        veiculosDisponiveis={veiculosDisponiveis}
        destinosDisponiveis={destinosDisponiveis}
        TURNO_OPTIONS={TURNO_OPTIONS}
        loadingEmpresas={loadingEmpresas}
        loadingDependencias={loadingDependencias}
        submitting={submitting}
        turnoBloqueado
        destinoBloqueado
        onSubmit={handleSubmit}
        onFieldChange={handleFieldChange}
      />

      <RouteMap rotas={rotasParaVisualizacao} funcionariosPorId={funcionariosPorId} />

      {rotasParaVisualizacao.length > 0 && (
        <RouteDetails
          rotas={rotasParaVisualizacao}
          funcionariosPorId={funcionariosPorId}
          veiculosPorId={veiculosPorId}
          formatarData={formatarData}
          getTurnoLabel={getTurnoLabel}
        />
      )}

      {erroGeracao && (
        <article className="message is-danger mt-5">
          <div className="message-header">
            <p>Falha ao gerar rota</p>
            <button
              type="button"
              className="delete"
              aria-label="Fechar mensagem de erro"
              onClick={() => {
                setErroGeracao(null)
                setSugestoesErro([])
              }}
            />
          </div>
          <div className="message-body">
            <p>{erroGeracao}</p>
            {sugestoesErro.length > 0 && (
              <>
                <p className="mt-3">Sugestoes do motor:</p>
                {renderSugestoes(sugestoesErro)}
              </>
            )}
          </div>
        </article>
      )}
    </section>
  )
}

export default GerarRotaAutomaticaPage

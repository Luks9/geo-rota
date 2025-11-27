import { AxiosError } from 'axios'
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { useNotification } from '../../hooks/useNotification'
import empresaService, { type Empresa } from '../funcionarios/services/empresaService'
import funcionarioService, { type Funcionario } from '../funcionarios/services/funcionarioService'
import grupoRotaService, { type GrupoRota } from '../gruposRota/services/grupoRotaService'
import destinoService, { type DestinoRota } from './services/destinoService'
import rotaAutomaticaService, {
  type GerarRotaPayload,
  type RotaGerada,
  type SugestaoVeiculoExtra,
  type TurnoTrabalho,
} from './services/rotaAutomaticaService'
import veiculoService, { type Veiculo } from './services/veiculoService'

type FormValues = {
  empresaId: string
  grupoRotaId: string
  dataAgendada: string
  turno: TurnoTrabalho
  motoristaId: string
  veiculoId: string
  usarDestinoManual: boolean
  destinoId: string
  destinoNome: string
  destinoLogradouro: string
  destinoNumero: string
  destinoComplemento: string
  destinoBairro: string
  destinoCidade: string
  destinoEstado: string
  destinoCep: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

const TURNO_OPTIONS: { value: TurnoTrabalho; label: string }[] = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
]

const hojeISO = new Date().toISOString().split('T')[0]

const defaultValues: FormValues = {
  empresaId: '',
  grupoRotaId: '',
  dataAgendada: hojeISO,
  turno: 'manha',
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

function GerarRotaAutomaticaPage() {
  const { danger, success } = useNotification()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [grupos, setGrupos] = useState<GrupoRota[]>([])
  const [motoristas, setMotoristas] = useState<Funcionario[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [destinos, setDestinos] = useState<DestinoRota[]>([])
  const [rotaGerada, setRotaGerada] = useState<RotaGerada | null>(null)
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

  const handleFieldChange =
    (field: keyof FormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      let { value, type, checked } = event.target as HTMLInputElement
      if (type === 'checkbox') {
        setValues((prev) => {
          const nextValue = checked
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

      if (field === 'empresaId') {
        setValues((prev) => ({
          ...prev,
          empresaId: value,
          grupoRotaId: '',
          motoristaId: '',
          veiculoId: '',
          destinoId: '',
        }))
      } else if (field === 'destinoEstado') {
        setValues((prev) => ({ ...prev, destinoEstado: value.toUpperCase() }))
      } else {
        setValues((prev) => ({ ...prev, [field]: value }))
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
    setRotaGerada(null)
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
      const rota = await rotaAutomaticaService.gerar(payload)
      setRotaGerada(rota)
      success('Rota gerada com sucesso!')
    } catch (error) {
      const axiosError = error as AxiosError
      const detail = (axiosError.response?.data as any)?.detail ?? axiosError.response?.data
      let mensagemErro = 'Nao foi possivel gerar a rota automaticamente.'
      let sugestoes: SugestaoVeiculoExtra[] = []
      if (detail) {
        if (typeof detail === 'string') {
          mensagemErro = detail
        } else if (typeof detail === 'object' && 'mensagem' in detail) {
          const mensagem = (detail as { mensagem: string }).mensagem
          sugestoes = (detail as { sugestoes?: SugestaoVeiculoExtra[] }).sugestoes ?? []
          mensagemErro = mensagem ?? mensagemErro
        } else if (typeof detail === 'object' && 'detail' in detail && typeof detail.detail === 'string') {
          mensagemErro = detail.detail
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

      <div className="box">
        <form onSubmit={handleSubmit}>
          <div className="columns is-multiline">
            <div className="column is-half">
              <div className="field">
                <label className="label" htmlFor="empresa">
                  Empresa
                </label>
                <div className="control">
                  <div className={`select is-fullwidth ${errors.empresaId ? 'is-danger' : ''}`}>
                    <select
                      id="empresa"
                      value={values.empresaId}
                      onChange={handleFieldChange('empresaId')}
                      disabled={loadingEmpresas || submitting}
                    >
                      <option value="">Selecione...</option>
                      {empresas.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {errors.empresaId && <p className="help is-danger">{errors.empresaId}</p>}
              </div>
            </div>

            <div className="column is-half">
              <div className="field">
                <label className="label" htmlFor="grupoRota">
                  Grupo de rota
                </label>
                <div className="control">
                  <div className={`select is-fullwidth ${errors.grupoRotaId ? 'is-danger' : ''}`}>
                    <select
                      id="grupoRota"
                      value={values.grupoRotaId}
                      onChange={handleFieldChange('grupoRotaId')}
                      disabled={!values.empresaId || loadingDependencias || submitting}
                    >
                      <option value="">Selecione...</option>
                      {gruposDisponiveis.map((grupo) => (
                        <option key={grupo.id} value={grupo.id}>
                          {grupo.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {errors.grupoRotaId && <p className="help is-danger">{errors.grupoRotaId}</p>}
              </div>
            </div>

            <div className="column is-one-quarter">
              <div className="field">
                <label className="label" htmlFor="dataAgendada">
                  Data
                </label>
                <div className="control">
                  <input
                    id="dataAgendada"
                    type="date"
                    className={`input ${errors.dataAgendada ? 'is-danger' : ''}`}
                    value={values.dataAgendada}
                    onChange={handleFieldChange('dataAgendada')}
                    disabled={submitting}
                  />
                </div>
                {errors.dataAgendada && <p className="help is-danger">{errors.dataAgendada}</p>}
              </div>
            </div>

            <div className="column is-one-quarter">
              <div className="field">
                <label className="label" htmlFor="turno">
                  Turno
                </label>
                <div className="control">
                  <div className="select is-fullwidth">
                    <select
                      id="turno"
                      value={values.turno}
                      onChange={handleFieldChange('turno')}
                      disabled={submitting}
                    >
                      {TURNO_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {errors.turno && <p className="help is-danger">{errors.turno}</p>}
              </div>
            </div>

            <div className="column is-half">
              <div className="field">
                <label className="label" htmlFor="motorista">
                  Motorista (opcional)
                </label>
                <div className="control">
                  <div className="select is-fullwidth">
                    <select
                      id="motorista"
                      value={values.motoristaId}
                      onChange={handleFieldChange('motoristaId')}
                      disabled={!values.empresaId || loadingDependencias || submitting || motoristasElegiveis.length === 0}
                    >
                      <option value="">Selecione...</option>
                      {motoristasElegiveis.map((funcionario) => (
                        <option key={funcionario.id} value={funcionario.id}>
                          {funcionario.nome_completo}
                        </option>
                      ))}
                    </select>
                  </div>
                  {motoristasElegiveis.length === 0 && values.empresaId && !loadingDependencias && (
                    <p className="help">Nenhum motorista disponível cadastrado.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="column is-half">
              <div className="field">
                <label className="label" htmlFor="veiculo">
                  Veículo (opcional)
                </label>
                <div className="control">
                  <div className="select is-fullwidth">
                    <select
                      id="veiculo"
                      value={values.veiculoId}
                      onChange={handleFieldChange('veiculoId')}
                      disabled={!values.empresaId || loadingDependencias || submitting || veiculosDisponiveis.length === 0}
                    >
                      <option value="">Selecione...</option>
                      {veiculosDisponiveis.map((veiculo) => (
                        <option key={veiculo.id} value={veiculo.id}>
                          {`${veiculo.placa} • ${veiculo.tipo} (${veiculo.capacidade_passageiros} lugares)`}
                        </option>
                      ))}
                    </select>
                  </div>
                  {veiculosDisponiveis.length === 0 && values.empresaId && !loadingDependencias && (
                    <p className="help">Nenhum veículo ativo cadastrado para esta empresa.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="column is-full">
              <div className="field">
                <label className="label">Destino</label>
                <div className="control mb-3">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={values.usarDestinoManual}
                      onChange={handleFieldChange('usarDestinoManual')}
                      disabled={submitting}
                    />
                    <span className="ml-2">Informar destino manualmente</span>
                  </label>
                </div>

                {!values.usarDestinoManual && (
                  <>
                    <div className="select is-fullwidth">
                      <select
                        value={values.destinoId}
                        onChange={handleFieldChange('destinoId')}
                        disabled={!values.empresaId || loadingDependencias || submitting || destinosDisponiveis.length === 0}
                      >
                        <option value="">Selecione um destino cadastrado</option>
                        {destinosDisponiveis.map((destino) => (
                          <option key={destino.id} value={destino.id}>
                            {destino.nome} — {destino.cidade}/{destino.estado}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.destinoId && <p className="help is-danger">{errors.destinoId}</p>}
                    {destinosDisponiveis.length === 0 && values.empresaId && !loadingDependencias && (
                      <p className="help">Nenhum destino cadastrado para esta empresa.</p>
                    )}
                  </>
                )}

                {values.usarDestinoManual && (
                  <div className="box mt-3">
                    <div className="columns is-multiline">
                      <div className="column is-half">
                        <div className="field">
                          <label className="label" htmlFor="destinoNome">
                            Nome
                          </label>
                          <div className="control">
                            <input
                              id="destinoNome"
                              className={`input ${errors.destinoNome ? 'is-danger' : ''}`}
                              type="text"
                              value={values.destinoNome}
                              onChange={handleFieldChange('destinoNome')}
                              disabled={submitting}
                            />
                          </div>
                          {errors.destinoNome && <p className="help is-danger">{errors.destinoNome}</p>}
                        </div>
                      </div>
                      <div className="column is-half">
                        <div className="field">
                          <label className="label" htmlFor="destinoLogradouro">
                            Logradouro
                          </label>
                          <div className="control">
                            <input
                              id="destinoLogradouro"
                              className={`input ${errors.destinoLogradouro ? 'is-danger' : ''}`}
                              type="text"
                              value={values.destinoLogradouro}
                              onChange={handleFieldChange('destinoLogradouro')}
                              disabled={submitting}
                            />
                          </div>
                          {errors.destinoLogradouro && <p className="help is-danger">{errors.destinoLogradouro}</p>}
                        </div>
                      </div>
                      <div className="column is-one-quarter">
                        <div className="field">
                          <label className="label" htmlFor="destinoNumero">
                            Número
                          </label>
                          <div className="control">
                            <input
                              id="destinoNumero"
                              className={`input ${errors.destinoNumero ? 'is-danger' : ''}`}
                              type="text"
                              value={values.destinoNumero}
                              onChange={handleFieldChange('destinoNumero')}
                              disabled={submitting}
                            />
                          </div>
                          {errors.destinoNumero && <p className="help is-danger">{errors.destinoNumero}</p>}
                        </div>
                      </div>
                      <div className="column is-three-quarters">
                        <div className="field">
                          <label className="label" htmlFor="destinoComplemento">
                            Complemento
                          </label>
                          <div className="control">
                            <input
                              id="destinoComplemento"
                              className="input"
                              type="text"
                              value={values.destinoComplemento}
                              onChange={handleFieldChange('destinoComplemento')}
                              disabled={submitting}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="column is-half">
                        <div className="field">
                          <label className="label" htmlFor="destinoBairro">
                            Bairro
                          </label>
                          <div className="control">
                            <input
                              id="destinoBairro"
                              className={`input ${errors.destinoBairro ? 'is-danger' : ''}`}
                              type="text"
                              value={values.destinoBairro}
                              onChange={handleFieldChange('destinoBairro')}
                              disabled={submitting}
                            />
                          </div>
                          {errors.destinoBairro && <p className="help is-danger">{errors.destinoBairro}</p>}
                        </div>
                      </div>
                      <div className="column is-half">
                        <div className="field">
                          <label className="label" htmlFor="destinoCidade">
                            Cidade
                          </label>
                          <div className="control">
                            <input
                              id="destinoCidade"
                              className={`input ${errors.destinoCidade ? 'is-danger' : ''}`}
                              type="text"
                              value={values.destinoCidade}
                              onChange={handleFieldChange('destinoCidade')}
                              disabled={submitting}
                            />
                          </div>
                          {errors.destinoCidade && <p className="help is-danger">{errors.destinoCidade}</p>}
                        </div>
                      </div>
                      <div className="column is-one-quarter">
                        <div className="field">
                          <label className="label" htmlFor="destinoEstado">
                            UF
                          </label>
                          <div className="control">
                            <input
                              id="destinoEstado"
                              className={`input ${errors.destinoEstado ? 'is-danger' : ''}`}
                              type="text"
                              maxLength={2}
                              value={values.destinoEstado}
                              onChange={handleFieldChange('destinoEstado')}
                              disabled={submitting}
                            />
                          </div>
                          {errors.destinoEstado && <p className="help is-danger">{errors.destinoEstado}</p>}
                        </div>
                      </div>
                      <div className="column is-one-quarter">
                        <div className="field">
                          <label className="label" htmlFor="destinoCep">
                            CEP
                          </label>
                          <div className="control">
                            <input
                              id="destinoCep"
                              className={`input ${errors.destinoCep ? 'is-danger' : ''}`}
                              type="text"
                              value={values.destinoCep}
                              onChange={handleFieldChange('destinoCep')}
                              disabled={submitting}
                            />
                          </div>
                          {errors.destinoCep && <p className="help is-danger">{errors.destinoCep}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="buttons is-right">
            <button type="submit" className={`button is-primary ${submitting ? 'is-loading' : ''}`} disabled={submitting}>
              {submitting ? 'Gerando...' : 'Gerar rota'}
            </button>
          </div>
        </form>
      </div>

      {rotaGerada && (
        <div className="box mt-5">
          <h2 className="title is-5 mb-3">Rota #{rotaGerada.id} gerada</h2>
          {rotaGerada.observacoes && (
            <p className="mb-2">
              <strong>Observações:</strong> {rotaGerada.observacoes}
            </p>
          )}
          <p className="mb-2">
            <strong>Status:</strong> {rotaGerada.status}
          </p>
          <p className="mb-2">
            <strong>Data:</strong> {formatarData(rotaGerada.data_agendada)} - {getTurnoLabel(rotaGerada.turno)}
          </p>
          <p className="mb-2">
            <strong>Motorista:</strong>{' '}
            {rotaGerada.motorista_id ? `ID ${rotaGerada.motorista_id}` : 'Selecionado automaticamente'}
          </p>
          <p className="mb-2">
            <strong>Veículo:</strong>{' '}
            {rotaGerada.veiculo_id
              ? veiculosPorId.get(rotaGerada.veiculo_id)
                ? `${veiculosPorId.get(rotaGerada.veiculo_id)!.placa} - ${
                    veiculosPorId.get(rotaGerada.veiculo_id)!.tipo
                  } (${veiculosPorId.get(rotaGerada.veiculo_id)!.capacidade_passageiros} lugares)`
                : `ID ${rotaGerada.veiculo_id}`
              : 'Selecionado automaticamente'}
          </p>
          {rotaGerada.destino && (
            <div className="mt-4">
              <h3 className="title is-6">Destino final</h3>
              <p>
                <strong>{rotaGerada.destino.nome}</strong>
              </p>
              <p>
                {rotaGerada.destino.logradouro}, {rotaGerada.destino.numero}
                {rotaGerada.destino.complemento ? ` - ${rotaGerada.destino.complemento}` : ''}
              </p>
              <p>
                {rotaGerada.destino.bairro} - {rotaGerada.destino.cidade}/{rotaGerada.destino.estado}
              </p>
              <p>CEP: {rotaGerada.destino.cep}</p>
            </div>
          )}
          {rotaGerada.atribuicoes.length > 0 && (
            <div className="mt-4">
              <h3 className="title is-6">Ordem das pessoas</h3>
              <div className="table-container">
                <table className="table is-fullwidth is-striped is-hoverable">
                  <thead>
                    <tr>
                      <th>Ordem</th>
                      <th>Nome</th>
                      <th>Papel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rotaGerada.atribuicoes]
                      .sort((a, b) => {
                        if (a.ordem_embarque == null && b.ordem_embarque == null) return 0
                        if (a.ordem_embarque == null) return 1
                        if (b.ordem_embarque == null) return -1
                        return a.ordem_embarque - b.ordem_embarque
                      })
                      .map((atribuicao) => (
                        <tr key={atribuicao.id}>
                          <td>{atribuicao.ordem_embarque ?? '-'}</td>
                          <td>
                            {funcionariosPorId.get(atribuicao.funcionario_id)?.nome_completo ??
                              `Funcionário #${atribuicao.funcionario_id}`}
                          </td>
                          <td>{atribuicao.papel}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {rotaGerada.sugestoes_veiculos.length > 0 && (
            <>
              <p className="mt-4">Sugestões adicionais de veículos:</p>
              {renderSugestoes(rotaGerada.sugestoes_veiculos)}
            </>
          )}
        </div>
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

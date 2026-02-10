
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'

import type { Empresa } from '../services/empresaService'
import grupoRotaService, { type GrupoRota } from '../../gruposRota/services/grupoRotaService'
import { maskCEP, maskCPF, maskPhone } from '../../../utils/masks'

export type EscalaFormValue = {
  diaSemana: number
  turno: 'manha' | 'tarde' | 'noite'
  disponivel: boolean
  horaInicio: string
  horaFim: string
}

export type GrupoRotaFormValue = {
  grupoId: number
}

export type FuncionarioFormValues = {
  empresaId: string
  nomeCompleto: string
  cpf: string
  email: string
  telefone: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  possuiCnh: boolean
  categoriaCnh: string
  cnhValidaAte: string
  aptoDirigir: boolean
  ativo: boolean
  escalas: EscalaFormValue[]
  gruposRota: GrupoRotaFormValue[]
}

type FuncionarioFormProps = {
  mode: 'create' | 'edit'
  empresas: Empresa[]
  initialValues?: FuncionarioFormValues
  loading?: boolean
  onSubmit: (values: FuncionarioFormValues) => Promise<void> | void
  onCancel: () => void
}

const defaultValues: FuncionarioFormValues = {
  empresaId: '',
  nomeCompleto: '',
  cpf: '',
  email: '',
  telefone: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
  possuiCnh: false,
  categoriaCnh: '',
  cnhValidaAte: '',
  aptoDirigir: false,
  ativo: true,
  escalas: [],
  gruposRota: [],
}


const DIA_SEMANA_OPTIONS = [
  { value: '0', label: 'Segunda-feira' },
  { value: '1', label: 'Terça-feira' },
  { value: '2', label: 'Quarta-feira' },
  { value: '3', label: 'Quinta-feira' },
  { value: '4', label: 'Sexta-feira' },
  { value: '5', label: 'Sábado' },
  { value: '6', label: 'Domingo' },
]

const TURNO_OPTIONS = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
]

const emptyEscalaDraft = { diaSemana: '', turno: '', disponivel: true, horaInicio: '', horaFim: '' }
const emptyGrupoRotaDraft = { grupoId: '' }

type FormErrors = Partial<Record<keyof FuncionarioFormValues, string>>

const sanitizeText = (value: string) => value.trim()

function FuncionarioForm({ mode, empresas, initialValues, loading = false, onSubmit, onCancel }: FuncionarioFormProps) {
  const [values, setValues] = useState<FuncionarioFormValues>(defaultValues)
  const [errors, setErrors] = useState<FormErrors>({})

  const [escalaDraft, setEscalaDraft] = useState<typeof emptyEscalaDraft>(emptyEscalaDraft)
  const [grupoRotaDraft, setGrupoRotaDraft] = useState<typeof emptyGrupoRotaDraft>(emptyGrupoRotaDraft)
  const [gruposDisponiveis, setGruposDisponiveis] = useState<GrupoRota[]>([])
  const [loadingGruposRota, setLoadingGruposRota] = useState(false)
  const [erroGruposRota, setErroGruposRota] = useState<string | null>(null)

  useEffect(() => {
    if (initialValues) {
      setValues(initialValues)
      setErrors({})
      setEscalaDraft(emptyEscalaDraft)
      if (initialValues.gruposRota.length > 0) {
        setGrupoRotaDraft({ grupoId: String(initialValues.gruposRota[0].grupoId) })
      } else {
        setGrupoRotaDraft(emptyGrupoRotaDraft)
      }
      return
    }

    setValues(() => ({
      ...defaultValues,
      empresaId: empresas.length === 1 ? String(empresas[0].id) : '',
    }))
    setErrors({})
    setEscalaDraft(emptyEscalaDraft)
    setGrupoRotaDraft(emptyGrupoRotaDraft)
  }, [empresas, initialValues])

  useEffect(() => {
    const empresaIdNumero = Number(values.empresaId)
    if (!values.empresaId || Number.isNaN(empresaIdNumero)) {
      setGruposDisponiveis([])
      setErroGruposRota(null)
      setLoadingGruposRota(false)
      return
    }

    let ativo = true
    setLoadingGruposRota(true)
    setErroGruposRota(null)

    void grupoRotaService
      .listar({ empresaId: empresaIdNumero })
      .then((lista) => {
        if (!ativo) return
        setGruposDisponiveis(lista)
      })
      .catch(() => {
        if (!ativo) return
        setErroGruposRota('Não foi possivel carregar os grupos da empresa selecionada.')
        setGruposDisponiveis([])
      })
      .finally(() => {
        if (!ativo) return
        setLoadingGruposRota(false)
      })

    return () => {
      ativo = false
    }
  }, [values.empresaId])

  const titleMessage = useMemo(() => {
    if (mode === 'create') {
      return 'Preencha os campos obrigatorios para cadastrar um novo funcionario.'
    }
    return 'Atualize os dados do funcionario e salve para aplicar as alteracoes.'
  }, [mode])

  const getDiaSemanaLabel = (value: number) =>
    DIA_SEMANA_OPTIONS.find((option) => Number(option.value) === value)?.label ?? `Dia ${value} `

  const getTurnoLabel = (turno: string) =>
    TURNO_OPTIONS.find((option) => option.value === turno)?.label ?? turno

  const getGrupoNome = (grupoId: number) =>
    gruposDisponiveis.find((grupo) => grupo.id === grupoId)?.nome ?? `Grupo #${grupoId} `

  const grupoSelecionadoAtual = useMemo(
    () => gruposDisponiveis.find((grupo) => String(grupo.id) === grupoRotaDraft.grupoId),
    [gruposDisponiveis, grupoRotaDraft.grupoId]
  )

  const formatarDias = (dias: number[]) => {
    if (dias.length === 0) {
      return 'Todos os dias'
    }
    return dias
      .slice()
      .sort((a, b) => a - b)
      .map((dia) => getDiaSemanaLabel(dia))
      .join(', ')
  }

  const formatDiasGrupo = (grupoId: number) => {
    const grupo = gruposDisponiveis.find((item) => item.id === grupoId)
    const dias = grupo?.dias_semana_padrao ?? []
    return formatarDias(dias)
  }

  const handleEscalaDraftChange =
    (field: 'diaSemana' | 'turno' | 'horaInicio' | 'horaFim') =>
      (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { value } = event.target
        setEscalaDraft((prev) => ({ ...prev, [field]: value }))
        if (errors.escalas) {
          setErrors((prev) => {
            const next = { ...prev }
            delete next.escalas
            return next
          })
        }
      }

  const handleEscalaDisponivelChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target
    setEscalaDraft((prev) => ({ ...prev, disponivel: checked }))
  }

  const handleAddEscala = () => {
    const { diaSemana, turno, disponivel, horaInicio, horaFim } = escalaDraft
    if (!diaSemana || !turno) {
      setErrors((prev) => ({ ...prev, escalas: 'Selecione o dia da semana e o turno.' }))
      return
    }
    const diaNumero = Number(diaSemana)
    if (Number.isNaN(diaNumero)) {
      setErrors((prev) => ({ ...prev, escalas: 'Dia da semana inválido.' }))
      return
    }
    const exists = values.escalas.some((esc) => esc.diaSemana === diaNumero && esc.turno === turno)
    if (exists) {
      setErrors((prev) => ({ ...prev, escalas: 'Já existe uma escala para esse dia e turno.' }))
      return
    }
    const novaEscala: EscalaFormValue = {
      diaSemana: diaNumero,
      turno: turno as 'manha' | 'tarde' | 'noite',
      disponivel,
      horaInicio: horaInicio.trim(),
      horaFim: horaFim.trim(),
    }
    setValues((prev) => ({
      ...prev,
      escalas: [...prev.escalas, novaEscala],
    }))
    setEscalaDraft(emptyEscalaDraft)
    setErrors((prev) => {
      if (!prev.escalas) return prev
      const next = { ...prev }
      delete next.escalas
      return next
    })
  }

  const handleRemoveEscala = (index: number) => {
    setValues((prev) => ({
      ...prev,
      escalas: prev.escalas.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const handleGrupoRotaDraftChange =
    (field: 'grupoId') =>
      (event: ChangeEvent<HTMLSelectElement>) => {
        const { value } = event.target
        setGrupoRotaDraft((prev) => ({ ...prev, [field]: value }))
        if (errors.gruposRota) {
          setErrors((prev) => {
            const next = { ...prev }
            delete next.gruposRota
            return next
          })
        }
      }

  const handleAddGrupoRota = () => {
    if (!values.empresaId) {
      setErrors((prev) => ({ ...prev, gruposRota: 'Selecione uma empresa para carregar os grupos.' }))
      return
    }

    if (!grupoRotaDraft.grupoId) {
      setErrors((prev) => ({ ...prev, gruposRota: 'Selecione um grupo de rota.' }))
      return
    }

    const grupoIdNumero = Number(grupoRotaDraft.grupoId)
    if (Number.isNaN(grupoIdNumero)) {
      setErrors((prev) => ({ ...prev, gruposRota: 'Grupo de rota inválido.' }))
      return
    }

    const grupoJaExistente = values.gruposRota.some((vinculo) => vinculo.grupoId === grupoIdNumero)
    if (grupoJaExistente) {
      setErrors((prev) => ({ ...prev, gruposRota: 'Este grupo já foi adicionado. Remova para editar.' }))
      return
    }

    setValues((prev) => ({
      ...prev,
      gruposRota: [
        ...prev.gruposRota,
        {
          grupoId: grupoIdNumero,
        },
      ],
    }))
    setGrupoRotaDraft(emptyGrupoRotaDraft)
    setErrors((prev) => {
      if (!prev.gruposRota) return prev
      const next = { ...prev }
      delete next.gruposRota
      return next
    })
  }

  const handleRemoveGrupoRota = (index: number) => {
    setValues((prev) => ({
      ...prev,
      gruposRota: prev.gruposRota.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const handleFieldChange =
    (field: keyof FuncionarioFormValues) =>
      (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        let { value } = event.target

        if (field === 'cpf') {
          value = maskCPF(value)
        } else if (field === 'telefone') {
          value = maskPhone(value)
        } else if (field === 'cep') {
          value = maskCEP(value)
        }

        setValues((prev) => {
          const next = { ...prev, [field]: value }
          if (field === 'empresaId') {
            next.gruposRota = []
          }
          return next
        })
        if (field === 'empresaId') {
          setGrupoRotaDraft(emptyGrupoRotaDraft)
        }
        if (errors[field]) {
          setErrors((prev) => {
            const next = { ...prev }
            delete next[field]
            return next
          })
        }
      }

  const handleCheckboxChange = (field: 'possuiCnh' | 'aptoDirigir' | 'ativo') => (event: ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target
    setValues((prev) => {
      const next = { ...prev, [field]: checked }
      if (field === 'possuiCnh' && !checked) {
        next.categoriaCnh = ''
        next.cnhValidaAte = ''
      }
      return next
    })
  }

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {}
    if (!values.empresaId) {
      nextErrors.empresaId = 'Selecione uma empresa.'
    }
    if (!sanitizeText(values.nomeCompleto)) {
      nextErrors.nomeCompleto = 'Informe o nome completo.'
    }
    if (!sanitizeText(values.cpf)) {
      nextErrors.cpf = 'Informe o CPF.'
    }
    if (!sanitizeText(values.logradouro)) {
      nextErrors.logradouro = 'Informe o logradouro.'
    }
    if (!sanitizeText(values.numero)) {
      nextErrors.numero = 'Informe o numero.'
    }
    if (!sanitizeText(values.bairro)) {
      nextErrors.bairro = 'Informe o bairro.'
    }
    const combinacoes = new Set<string>()
    for (const escala of values.escalas) {
      const chave = `${escala.diaSemana} -${escala.turno} `
      if (combinacoes.has(chave)) {
        nextErrors.escalas = 'N�o repita o mesmo dia e turno na escala.'
        break
      }
      combinacoes.add(chave)
    }
    if (!sanitizeText(values.cidade)) {
      nextErrors.cidade = 'Informe a cidade.'
    }
    const uf = sanitizeText(values.estado)
    if (!uf) {
      nextErrors.estado = 'Informe a UF.'
    } else if (uf.length !== 2) {
      nextErrors.estado = 'UF deve conter 2 caracteres.'
    }
    if (!sanitizeText(values.cep)) {
      nextErrors.cep = 'Informe o CEP.'
    }
    if (values.possuiCnh && !sanitizeText(values.categoriaCnh)) {
      nextErrors.categoriaCnh = 'Informe a categoria da CNH.'
    }
    return nextErrors
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    await onSubmit({
      ...values,
      empresaId: values.empresaId,
      nomeCompleto: sanitizeText(values.nomeCompleto),
      cpf: sanitizeText(values.cpf),
      email: sanitizeText(values.email),
      telefone: sanitizeText(values.telefone),
      logradouro: sanitizeText(values.logradouro),
      numero: sanitizeText(values.numero),
      complemento: sanitizeText(values.complemento),
      bairro: sanitizeText(values.bairro),
      cidade: sanitizeText(values.cidade),
      estado: sanitizeText(values.estado).toUpperCase(),
      cep: sanitizeText(values.cep),
      categoriaCnh: sanitizeText(values.categoriaCnh),
      cnhValidaAte: sanitizeText(values.cnhValidaAte),
      escalas: values.escalas,
    })

    setEscalaDraft(emptyEscalaDraft)
  }

  const empresaSelecionada = empresas.find((empresa) => String(empresa.id) === values.empresaId)

  return (
    <form onSubmit={handleSubmit}>
      <p className="mb-4 has-text-grey-dark">{titleMessage}</p>

      <div className="columns is-multiline">
        <div className="column is-half">
          <div className="field">
            <label className="label" htmlFor="empresa">
              Empresa
            </label>
            <div className="control">
              <div className={`select is - fullwidth ${errors.empresaId ? 'is-danger' : ''} `}>
                <select
                  id="empresa"
                  value={values.empresaId}
                  onChange={handleFieldChange('empresaId')}
                  disabled={loading || mode === 'edit'}
                  required
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

        <div className="column is-full">
          <div className="box">
            <h2 className="title is-6">Grupos de rota</h2>
            {!values.empresaId ? (
              <p className="has-text-grey">Selecione uma empresa para carregar os grupos disponíveis.</p>
            ) : loadingGruposRota ? (
              <p>Carregando grupos...</p>
            ) : (
              <>
                <div className="columns is-multiline">
                  <div className="column is-6">
                    <div className="field">
                      <label className="label" htmlFor="grupoRotaSelect">
                        Grupo
                      </label>
                      <div className="control">
                        <div className="select is-fullwidth">
                          <select
                            id="grupoRotaSelect"
                            value={grupoRotaDraft.grupoId}
                            onChange={handleGrupoRotaDraftChange('grupoId')}
                            disabled={loading || gruposDisponiveis.length === 0}
                          >
                            <option value="">Selecione</option>
                            {gruposDisponiveis.map((grupo) => (
                              <option key={grupo.id} value={grupo.id}>
                                {grupo.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="column is-4">
                    <div className="field">
                      <label className="label">Dias fixos do grupo</label>
                      <div className="control">
                        <p className="tag is-light">
                          {grupoSelecionadoAtual ? formatarDias(grupoSelecionadoAtual.dias_semana_padrao ?? []) : 'Selecione um grupo'}
                        </p>
                      </div>
                      <p className="help">Definido no cadastro do grupo.</p>
                    </div>
                  </div>

                  <div className="column is-2">
                    <div className="field">
                      <label className="label">&nbsp;</label>
                      <div className="control">
                        <button
                          type="button"
                          className="button is-link is-light is-fullwidth"
                          onClick={handleAddGrupoRota}
                          disabled={loading || gruposDisponiveis.length === 0}
                        >
                          Adicionar grupo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {errors.gruposRota && <p className="help is-danger">{errors.gruposRota}</p>}
                {erroGruposRota && <p className="help is-danger">{erroGruposRota}</p>}
                {gruposDisponiveis.length === 0 && !erroGruposRota && (
                  <p className="help">Nenhum grupo cadastrado para esta empresa.</p>
                )}

                {values.gruposRota.length > 0 && (
                  <div className="table-container mt-3">
                    <table className="table is-fullwidth is-striped is-hoverable">
                      <thead>
                        <tr>
                          <th>Grupo</th>
                          <th>Dias</th>
                          <th className="has-text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {values.gruposRota.map((vinculo, index) => (
                          <tr key={vinculo.grupoId}>
                            <td>{getGrupoNome(vinculo.grupoId)}</td>
                            <td>{formatDiasGrupo(vinculo.grupoId)}</td>
                            <td className="has-text-right">
                              <button
                                type="button"
                                className="button is-small is-danger is-light"
                                onClick={() => handleRemoveGrupoRota(index)}
                                disabled={loading}
                              >
                                <span className="icon is-small">
                                  <i className="fas fa-trash-alt" aria-hidden="true" />
                                </span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="column is-half">
          <div className="field">
            <label className="label" htmlFor="cpf">
              CPF
            </label>
            <div className="control">
              <input
                id="cpf"
                className={`input ${errors.cpf ? 'is-danger' : ''} `}
                type="text"
                placeholder="000.000.000-00"
                value={values.cpf}
                onChange={handleFieldChange('cpf')}
                disabled={loading || mode === 'edit'}
                required
              />
            </div>
            {errors.cpf && <p className="help is-danger">{errors.cpf}</p>}
          </div>
        </div>

        <div className="column is-full">
          <div className="field">
            <label className="label" htmlFor="nome">
              Nome completo
            </label>
            <div className="control">
              <input
                id="nome"
                className={`input ${errors.nomeCompleto ? 'is-danger' : ''} `}
                type="text"
                placeholder="Maria Silva"
                value={values.nomeCompleto}
                onChange={handleFieldChange('nomeCompleto')}
                disabled={loading}
                required
              />
            </div>
            {errors.nomeCompleto && <p className="help is-danger">{errors.nomeCompleto}</p>}
          </div>
        </div>

        <div className="column is-half">
          <div className="field">
            <label className="label" htmlFor="email">
              Email
            </label>
            <div className="control">
              <input
                id="email"
                className="input"
                type="email"
                placeholder="nome@empresa.com"
                value={values.email}
                onChange={handleFieldChange('email')}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="column is-half">
          <div className="field">
            <label className="label" htmlFor="telefone">
              Telefone
            </label>
            <div className="control">
              <input
                id="telefone"
                className="input"
                type="text"
                placeholder="(00) 00000-0000"
                value={values.telefone}
                onChange={handleFieldChange('telefone')}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="column is-three-quarters">
          <div className="field">
            <label className="label" htmlFor="logradouro">
              Logradouro
            </label>
            <div className="control">
              <input
                id="logradouro"
                className={`input ${errors.logradouro ? 'is-danger' : ''} `}
                type="text"
                placeholder="Rua, avenida..."
                value={values.logradouro}
                onChange={handleFieldChange('logradouro')}
                disabled={loading}
                required
              />
            </div>
            {errors.logradouro && <p className="help is-danger">{errors.logradouro}</p>}
          </div>
        </div>

        <div className="column is-one-quarter">
          <div className="field">
            <label className="label" htmlFor="numero">
              Numero
            </label>
            <div className="control">
              <input
                id="numero"
                className={`input ${errors.numero ? 'is-danger' : ''} `}
                type="text"
                placeholder="123"
                value={values.numero}
                onChange={handleFieldChange('numero')}
                disabled={loading}
                required
              />
            </div>
            {errors.numero && <p className="help is-danger">{errors.numero}</p>}
          </div>
        </div>

        <div className="column is-half">
          <div className="field">
            <label className="label" htmlFor="complemento">
              Complemento
            </label>
            <div className="control">
              <input
                id="complemento"
                className="input"
                type="text"
                placeholder="Apartamento, bloco..."
                value={values.complemento}
                onChange={handleFieldChange('complemento')}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="column is-half">
          <div className="field">
            <label className="label" htmlFor="bairro">
              Bairro
            </label>
            <div className="control">
              <input
                id="bairro"
                className={`input ${errors.bairro ? 'is-danger' : ''} `}
                type="text"
                placeholder="Centro"
                value={values.bairro}
                onChange={handleFieldChange('bairro')}
                disabled={loading}
                required
              />
            </div>
            {errors.bairro && <p className="help is-danger">{errors.bairro}</p>}
          </div>
        </div>

        <div className="column is-half">
          <div className="field">
            <label className="label" htmlFor="cidade">
              Cidade
            </label>
            <div className="control">
              <input
                id="cidade"
                className={`input ${errors.cidade ? 'is-danger' : ''} `}
                type="text"
                placeholder="Sao Paulo"
                value={values.cidade}
                onChange={handleFieldChange('cidade')}
                disabled={loading}
                required
              />
            </div>
            {errors.cidade && <p className="help is-danger">{errors.cidade}</p>}
          </div>
        </div>

        <div className="column is-one-quarter">
          <div className="field">
            <label className="label" htmlFor="estado">
              UF
            </label>
            <div className="control">
              <input
                id="estado"
                className={`input ${errors.estado ? 'is-danger' : ''} `}
                type="text"
                placeholder="SP"
                value={values.estado}
                onChange={handleFieldChange('estado')}
                maxLength={2}
                disabled={loading}
                required
              />
            </div>
            {errors.estado && <p className="help is-danger">{errors.estado}</p>}
          </div>
        </div>

        <div className="column is-one-quarter">
          <div className="field">
            <label className="label" htmlFor="cep">
              CEP
            </label>
            <div className="control">
              <input
                id="cep"
                className={`input ${errors.cep ? 'is-danger' : ''} `}
                type="text"
                placeholder="00000-000"
                value={values.cep}
                onChange={handleFieldChange('cep')}
                disabled={loading}
                required
              />
            </div>
            {errors.cep && <p className="help is-danger">{errors.cep}</p>}
          </div>
        </div>

        <div className="column is-full">
          <div className="box">
            <h2 className="title is-6">Escala de trabalho</h2>
            <div className="columns is-multiline">
              <div className="column is-3">
                <div className="field">
                  <label className="label" htmlFor="escalaDia">
                    Dia da semana
                  </label>
                  <div className="control">
                    <div className="select is-fullwidth">
                      <select
                        id="escalaDia"
                        value={escalaDraft.diaSemana}
                        onChange={handleEscalaDraftChange('diaSemana')}
                        disabled={loading}
                      >
                        <option value="">Selecione</option>
                        {DIA_SEMANA_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="column is-3">
                <div className="field">
                  <label className="label" htmlFor="escalaTurno">
                    Turno
                  </label>
                  <div className="control">
                    <div className="select is-fullwidth">
                      <select
                        id="escalaTurno"
                        value={escalaDraft.turno}
                        onChange={handleEscalaDraftChange('turno')}
                        disabled={loading}
                      >
                        <option value="">Selecione</option>
                        {TURNO_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="column is-2">
                <div className="field">
                  <label className="label" htmlFor="escalaHoraInicio">
                    Hora inicio
                  </label>
                  <div className="control">
                    <input
                      id="escalaHoraInicio"
                      className="input"
                      type="time"
                      value={escalaDraft.horaInicio}
                      onChange={handleEscalaDraftChange('horaInicio')}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="column is-2">
                <div className="field">
                  <label className="label" htmlFor="escalaHoraFim">
                    Hora fim
                  </label>
                  <div className="control">
                    <input
                      id="escalaHoraFim"
                      className="input"
                      type="time"
                      value={escalaDraft.horaFim}
                      onChange={handleEscalaDraftChange('horaFim')}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="column is-2">
                <div className="field">
                  <label className="label">Disponibilidade</label>
                  <div className="control">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={escalaDraft.disponivel}
                        onChange={handleEscalaDisponivelChange}
                        disabled={loading}
                      />
                      <span className="ml-2">Disponível</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="column is-12">
                <div className="field">
                  <div className="control">
                    <button
                      type="button"
                      className="button is-link is-light"
                      onClick={handleAddEscala}
                      disabled={loading}
                    >
                      Adicionar escala
                    </button>
                  </div>
                </div>
                {errors.escalas && <p className="help is-danger">{errors.escalas}</p>}
              </div>
            </div>

            {values.escalas.length > 0 && (
              <div className="table-container mt-3">
                <table className="table is-fullwidth is-striped is-hoverable">
                  <thead>
                    <tr>
                      <th>Dia</th>
                      <th>Turno</th>
                      <th>Disponível</th>
                      <th>Hora início</th>
                      <th>Hora fim</th>
                      <th className="has-text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {values.escalas.map((escala, index) => (
                      <tr key={`${escala.diaSemana} -${escala.turno} `}>
                        <td>{getDiaSemanaLabel(escala.diaSemana)}</td>
                        <td>{getTurnoLabel(escala.turno)}</td>
                        <td>{escala.disponivel ? 'Sim' : 'Não'}</td>
                        <td>{escala.horaInicio || '--'}</td>
                        <td>{escala.horaFim || '--'}</td>
                        <td className="has-text-right">
                          <button
                            type="button"
                            className="button is-small is-danger is-light"
                            onClick={() => handleRemoveEscala(index)}
                            disabled={loading}
                          >
                            <span className="icon is-small">
                              <i className="fas fa-trash-alt" aria-hidden="true" />
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="column is-full">
          <div className="field">
            <label className="label">Habilitacao</label>
            <div className="control">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={values.possuiCnh}
                  onChange={handleCheckboxChange('possuiCnh')}
                  disabled={loading}
                />
                <span className="ml-2">Possui CNH</span>
              </label>
            </div>
          </div>
        </div>

        <div className="column is-half">
          <div className="field">
            <label className="label" htmlFor="categoriaCnh">
              Categoria da CNH
            </label>
            <div className="control">
              <input
                id="categoriaCnh"
                className={`input ${errors.categoriaCnh ? 'is-danger' : ''} `}
                type="text"
                placeholder="B, C..."
                value={values.categoriaCnh}
                onChange={handleFieldChange('categoriaCnh')}
                disabled={loading || !values.possuiCnh}
              />
            </div>
            {errors.categoriaCnh && <p className="help is-danger">{errors.categoriaCnh}</p>}
          </div>
        </div>

        <div className="column is-half">
          <div className="field">
            <label className="label" htmlFor="cnhValidaAte">
              CNH valida ate
            </label>
            <div className="control">
              <input
                id="cnhValidaAte"
                className="input"
                type="date"
                value={values.cnhValidaAte}
                onChange={handleFieldChange('cnhValidaAte')}
                disabled={loading || !values.possuiCnh}
              />
            </div>
          </div>
        </div>

        <div className="column is-full">
          <div className="field is-grouped is-grouped-multiline">
            <div className="control">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={values.aptoDirigir}
                  onChange={handleCheckboxChange('aptoDirigir')}
                  disabled={loading}
                />
                <span className="ml-2">Apto a dirigir</span>
              </label>
            </div>
            <div className="control">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={values.ativo}
                  onChange={handleCheckboxChange('ativo')}
                  disabled={loading}
                />
                <span className="ml-2">Ativo</span>
              </label>
            </div>
          </div>
        </div>

        {empresaSelecionada && (
          <div className="column is-full">
            <p className="help">
              Funcionario vinculado a empresa <strong>{empresaSelecionada.nome}</strong>.
            </p>
          </div>
        )}
      </div>

      <div className="buttons is-right">
        <button type="button" className="button is-light" onClick={onCancel} disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className={`button ${mode === 'create' ? 'is-success' : 'is-link'} `} disabled={loading}>
          {loading ? 'Processando...' : mode === 'create' ? 'Cadastrar' : 'Salvar alteracoes'}
        </button>
      </div>
    </form>
  )
}

export default FuncionarioForm

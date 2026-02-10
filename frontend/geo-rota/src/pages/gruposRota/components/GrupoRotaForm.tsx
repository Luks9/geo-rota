
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'

import type { Empresa } from '../../funcionarios/services/empresaService'

export type GrupoRotaFormValues = {
  empresaId: string
  nome: string
  tipoRegime: 'diario' | 'embarque'
  diasSemanaPadrao: number[]
  descricao: string
}

type GrupoRotaFormProps = {
  mode: 'create' | 'edit'
  empresas: Empresa[]
  initialValues?: GrupoRotaFormValues
  loading?: boolean
  onSubmit: (values: GrupoRotaFormValues) => Promise<void> | void
  onCancel: () => void
}

const defaultValues: GrupoRotaFormValues = {
  empresaId: '',
  nome: '',
  tipoRegime: 'diario',
  diasSemanaPadrao: [],
  descricao: '',
}

const DIA_SEMANA_OPTIONS = [
  { value: 0, label: 'Segunda-feira' },
  { value: 1, label: 'Terça-feira' },
  { value: 2, label: 'Quarta-feira' },
  { value: 3, label: 'Quinta-feira' },
  { value: 4, label: 'Sexta-feira' },
  { value: 5, label: 'Sábado' },
  { value: 6, label: 'Domingo' },
]

type FormErrors = Partial<Record<keyof GrupoRotaFormValues, string>>

const sanitizeText = (value: string) => value.trim()

function GrupoRotaForm({ mode, empresas, initialValues, loading = false, onSubmit, onCancel }: GrupoRotaFormProps) {
  const [values, setValues] = useState<GrupoRotaFormValues>(defaultValues)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (initialValues) {
      setValues(initialValues)
      setErrors({})
      return
    }

    setValues((prev) => ({
      ...defaultValues,
      empresaId: empresas.length === 1 ? String(empresas[0].id) : '',
    }))
    setErrors({})
  }, [empresas, initialValues])

  const handleChange = (
    field: keyof Omit<GrupoRotaFormValues, 'diasSemanaPadrao'>
  ) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleDiaSemanaToggle = (dia: number) => {
    setValues((prev) => {
      const selecionado = prev.diasSemanaPadrao.includes(dia)
      const diasAtualizados = selecionado
        ? prev.diasSemanaPadrao.filter((item) => item !== dia)
        : [...prev.diasSemanaPadrao, dia]
      return { ...prev, diasSemanaPadrao: diasAtualizados }
    })
  }

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {}
    if (!values.empresaId) {
      nextErrors.empresaId = 'Selecione uma empresa.'
    }
    if (!sanitizeText(values.nome)) {
      nextErrors.nome = 'Informe o nome do grupo.'
    }
    if (!values.tipoRegime) {
      nextErrors.tipoRegime = 'Selecione o regime.'
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
      nome: sanitizeText(values.nome),
      descricao: sanitizeText(values.descricao),
    })
  }

  const empresaSelecionada = empresas.find((empresa) => String(empresa.id) === values.empresaId)

  const formatDiasSelecionados = () => {
    if (values.diasSemanaPadrao.length === 0) {
      return 'Todos os dias'
    }
    return values.diasSemanaPadrao
      .slice()
      .sort((a, b) => a - b)
      .map((dia) => DIA_SEMANA_OPTIONS.find((option) => option.value === dia)?.label ?? `Dia ${dia}`)
      .join(', ')
  }

  return (
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
                  onChange={handleChange('empresaId')}
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

        <div className="column is-half">
          <div className="field">
            <label className="label" htmlFor="tipoRegime">
              Regime
            </label>
            <div className="control">
              <div className={`select is-fullwidth ${errors.tipoRegime ? 'is-danger' : ''}`}>
                <select id="tipoRegime" value={values.tipoRegime} onChange={handleChange('tipoRegime')} disabled={loading}>
                  <option value="diario">Diário</option>
                  <option value="embarque">Embarque</option>
                </select>
              </div>
            </div>
            {errors.tipoRegime && <p className="help is-danger">{errors.tipoRegime}</p>}
          </div>
        </div>

        <div className="column is-full">
          <div className="field">
            <label className="label" htmlFor="nome">
              Nome
            </label>
            <div className="control">
              <input
                id="nome"
                className={`input ${errors.nome ? 'is-danger' : ''}`}
                type="text"
                placeholder="Equipe madrugada"
                value={values.nome}
                onChange={handleChange('nome')}
                disabled={loading}
                required
              />
            </div>
            {errors.nome && <p className="help is-danger">{errors.nome}</p>}
          </div>
        </div>

        <div className="column is-full">
          <div className="field">
            <label className="label">Dias fixos</label>
            <div className="control is-flex is-flex-wrap-wrap">
              {DIA_SEMANA_OPTIONS.map((option) => {
                const marcado = values.diasSemanaPadrao.includes(option.value)
                return (
                  <label key={option.value} className="checkbox mr-4 mb-2">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => handleDiaSemanaToggle(option.value)}
                      disabled={loading}
                    />
                    <span className="ml-2">{option.label}</span>
                  </label>
                )
              })}
            </div>
            <p className="help">
              {values.diasSemanaPadrao.length === 0
                ? 'Todos os dias estão selecionados.'
                : `Dias selecionados: ${formatDiasSelecionados()}`}
            </p>
            <p className="help">Desmarque todos para permitir uso em qualquer dia.</p>
          </div>
        </div>

        <div className="column is-full">
          <div className="field">
            <label className="label" htmlFor="descricao">
              Descrição
            </label>
            <div className="control">
              <textarea
                id="descricao"
                className="textarea"
                placeholder="Observações do grupo"
                value={values.descricao}
                onChange={handleChange('descricao')}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {empresaSelecionada && (
          <div className="column is-full">
            <p className="help">
              Grupo vinculado à empresa <strong>{empresaSelecionada.nome}</strong>.
            </p>
          </div>
        )}
      </div>

      <div className="buttons is-right">
        <button type="button" className="button is-light" onClick={onCancel} disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className={`button ${mode === 'create' ? 'is-success' : 'is-link'}`} disabled={loading}>
          {loading ? 'Processando...' : mode === 'create' ? 'Cadastrar grupo' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}

export default GrupoRotaForm

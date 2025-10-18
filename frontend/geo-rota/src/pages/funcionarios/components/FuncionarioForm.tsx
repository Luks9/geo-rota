import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'

import type { Empresa } from '../services/empresaService'

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
}

type FormErrors = Partial<Record<keyof FuncionarioFormValues, string>>

const sanitizeText = (value: string) => value.trim()

function FuncionarioForm({ mode, empresas, initialValues, loading = false, onSubmit, onCancel }: FuncionarioFormProps) {
  const [values, setValues] = useState<FuncionarioFormValues>(defaultValues)
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

  const titleMessage = useMemo(() => {
    if (mode === 'create') {
      return 'Preencha os campos obrigatorios para cadastrar um novo funcionario.'
    }
    return 'Atualize os dados do funcionario e salve para aplicar as alteracoes.'
  }, [mode])

  const handleFieldChange =
    (field: keyof FuncionarioFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    })
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
              <div className={`select is-fullwidth ${errors.empresaId ? 'is-danger' : ''}`}>
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

        <div className="column is-half">
          <div className="field">
            <label className="label" htmlFor="cpf">
              CPF
            </label>
            <div className="control">
              <input
                id="cpf"
                className={`input ${errors.cpf ? 'is-danger' : ''}`}
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
                className={`input ${errors.nomeCompleto ? 'is-danger' : ''}`}
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
                className={`input ${errors.logradouro ? 'is-danger' : ''}`}
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
                className={`input ${errors.numero ? 'is-danger' : ''}`}
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
                className={`input ${errors.bairro ? 'is-danger' : ''}`}
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
                className={`input ${errors.cidade ? 'is-danger' : ''}`}
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
                className={`input ${errors.estado ? 'is-danger' : ''}`}
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
                className={`input ${errors.cep ? 'is-danger' : ''}`}
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
                className={`input ${errors.categoriaCnh ? 'is-danger' : ''}`}
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
        <button type="submit" className={`button ${mode === 'create' ? 'is-success' : 'is-link'}`} disabled={loading}>
          {loading ? 'Processando...' : mode === 'create' ? 'Cadastrar' : 'Salvar alteracoes'}
        </button>
      </div>
    </form>
  )
}

export default FuncionarioForm

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useNotification } from '../../hooks/useNotification'
import empresaService, { type Empresa } from '../funcionarios/services/empresaService'
import grupoRotaService, {
  type GrupoRota,
  type GrupoRotaCreatePayload,
  type GrupoRotaUpdatePayload,
} from './services/grupoRotaService'
import GrupoRotaForm, { type GrupoRotaFormValues } from './components/GrupoRotaForm'

const nullIfEmpty = (value: string) => {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

const toFormValues = (grupo: GrupoRota): GrupoRotaFormValues => ({
  empresaId: String(grupo.empresa_id),
  nome: grupo.nome,
  tipoRegime: grupo.tipo_regime,
  diasSemanaPadrao: [...grupo.dias_semana_padrao],
  descricao: grupo.descricao ?? '',
})

const buildCreatePayload = (values: GrupoRotaFormValues): GrupoRotaCreatePayload => ({
  empresa_id: Number(values.empresaId),
  nome: values.nome,
  tipo_regime: values.tipoRegime,
  dias_semana_padrao: values.diasSemanaPadrao,
  descricao: nullIfEmpty(values.descricao),
})

const buildUpdatePayload = (values: GrupoRotaFormValues): GrupoRotaUpdatePayload => ({
  nome: values.nome,
  tipo_regime: values.tipoRegime,
  dias_semana_padrao: values.diasSemanaPadrao,
  descricao: nullIfEmpty(values.descricao),
})

type GrupoRotaFormPageProps = {
  mode: 'create' | 'edit'
}

function GrupoRotaFormPage({ mode }: GrupoRotaFormPageProps) {
  const { grupoId } = useParams<{ grupoId: string }>()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [initialValues, setInitialValues] = useState<GrupoRotaFormValues>()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { danger, success } = useNotification()
  const navigate = useNavigate()

  const isEditMode = mode === 'edit'
  const grupoIdNumber = useMemo(() => {
    if (!grupoId) return undefined
    const parsed = Number(grupoId)
    return Number.isNaN(parsed) ? undefined : parsed
  }, [grupoId])

  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const listaEmpresas = await empresaService.listar()
      setEmpresas(listaEmpresas)

      if (mode === 'create') {
        if (listaEmpresas.length === 0) {
          danger('Cadastre uma empresa antes de adicionar grupos de rota.')
          navigate('/cadastro/funcionarios')
          return
        }
        setInitialValues(undefined)
        return
      }

      if (!grupoIdNumber) {
        danger('Grupo de rota não encontrado.')
        navigate('/cadastro/grupos-rota')
        return
      }

      const grupo = await grupoRotaService.obter(grupoIdNumber)
      setInitialValues(toFormValues(grupo))
    } catch (error) {
      console.error(error)
      danger('Não foi possível carregar os dados do formulário.')
      navigate('/cadastro/grupos-rota')
    } finally {
      setLoading(false)
    }
  }, [danger, grupoIdNumber, mode, navigate])

  useEffect(() => {
    void carregarDados()
  }, [carregarDados])

  const handleSubmit = async (values: GrupoRotaFormValues) => {
    setSubmitting(true)
    try {
      if (mode === 'create') {
        await grupoRotaService.criar(buildCreatePayload(values))
        success('Grupo cadastrado com sucesso.')
      } else if (grupoIdNumber) {
        await grupoRotaService.atualizar(grupoIdNumber, buildUpdatePayload(values))
        success('Grupo atualizado com sucesso.')
      }
      navigate('/cadastro/grupos-rota')
    } catch (error) {
      console.error(error)
      danger('Não foi possível concluir a operação. Tente novamente.')
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate('/cadastro/grupos-rota')
  }

  if (loading) {
    return (
      <section className="section">
        <p>Carregando dados do formulário...</p>
      </section>
    )
  }

  if (isEditMode && !initialValues) {
    return (
      <section className="section">
        <p>Grupo de rota não encontrado.</p>
      </section>
    )
  }

  return (
    <section className="section">
      <div className="level mb-4">
        <div className="level-left">
          <div>
            <h1 className="title is-4">{isEditMode ? 'Editar grupo de rota' : 'Novo grupo de rota'}</h1>
            <p className="subtitle is-6 has-text-grey">
              {isEditMode
                ? 'Atualize as informações do grupo e salve para aplicar as alterações.'
                : 'Preencha os campos obrigatórios para cadastrar um novo grupo.'}
            </p>
          </div>
        </div>
        <div className="level-right">
          <button type="button" className="button is-light" onClick={handleCancel}>
            <span className="icon">
              <i className="fas fa-arrow-left" aria-hidden="true" />
            </span>
            <span>Voltar</span>
          </button>
        </div>
      </div>

      <div className="box">
        <GrupoRotaForm
          mode={mode}
          empresas={empresas}
          initialValues={isEditMode ? initialValues : undefined}
          loading={submitting}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </section>
  )
}

export default GrupoRotaFormPage

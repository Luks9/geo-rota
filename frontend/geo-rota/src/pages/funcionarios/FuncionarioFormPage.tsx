import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import FuncionarioForm, {
  type EscalaFormValue,
  type FuncionarioFormValues,
} from './components/FuncionarioForm'
import empresaService, { type Empresa } from './services/empresaService'
import funcionarioService, {
  type FuncionarioCreatePayload,
  type FuncionarioDetalhado,
  type FuncionarioUpdatePayload,
} from './services/funcionarioService'
import { useNotification } from '../../hooks/useNotification'
import { maskCEP, maskCPF, maskPhone, unmask } from '../../utils/masks'

type FuncionarioFormPageProps = {
  mode: 'create' | 'edit'
}

const nullIfEmpty = (value: string) => {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

const mapEscalaFormToPayload = (escala: EscalaFormValue) => ({
  dia_semana: escala.diaSemana,
  turno: escala.turno,
  disponivel: escala.disponivel,
  hora_inicio: escala.horaInicio || null,
  hora_fim: escala.horaFim || null,
})

const mapGrupoRotaFormToPayload = (grupo: FuncionarioFormValues['gruposRota'][number]) => ({
  grupo_rota_id: grupo.grupoId,
})

const toFormValues = (funcionario: FuncionarioDetalhado): FuncionarioFormValues => {
  const gruposRota = funcionario.grupos_rota.map((vinculo) => ({
    grupoId: vinculo.grupo_rota_id,
  }))

  return {
    empresaId: String(funcionario.empresa_id),
    nomeCompleto: funcionario.nome_completo,
    cpf: maskCPF(funcionario.cpf),
    email: funcionario.email ?? '',
    telefone: funcionario.telefone ? maskPhone(funcionario.telefone) : '',
    logradouro: funcionario.logradouro,
    numero: funcionario.numero,
    complemento: funcionario.complemento ?? '',
    bairro: funcionario.bairro,
    cidade: funcionario.cidade,
    estado: funcionario.estado,
    cep: maskCEP(funcionario.cep),
    possuiCnh: funcionario.possui_cnh,
    categoriaCnh: funcionario.categoria_cnh ?? '',
    cnhValidaAte: funcionario.cnh_valida_ate ?? '',
    aptoDirigir: funcionario.apto_dirigir,
    ativo: funcionario.ativo,
    escalas: funcionario.escalas_trabalho.map((escala) => ({
      diaSemana: escala.dia_semana,
      turno: escala.turno as 'manha' | 'tarde' | 'noite',
      disponivel: escala.disponivel,
      horaInicio: escala.hora_inicio ?? '',
      horaFim: escala.hora_fim ?? '',
    })),
    gruposRota,
  }
}

const buildCreatePayload = (values: FuncionarioFormValues): FuncionarioCreatePayload => ({
  empresa_id: Number(values.empresaId),
  nome_completo: values.nomeCompleto,
  cpf: unmask(values.cpf),
  email: nullIfEmpty(values.email),
  telefone: unmask(values.telefone) || null,
  logradouro: values.logradouro,
  numero: values.numero,
  complemento: nullIfEmpty(values.complemento),
  bairro: values.bairro,
  cidade: values.cidade,
  estado: values.estado,
  cep: unmask(values.cep),
  possui_cnh: values.possuiCnh,
  categoria_cnh: values.possuiCnh ? nullIfEmpty(values.categoriaCnh) : null,
  cnh_valida_ate: values.possuiCnh && values.cnhValidaAte ? values.cnhValidaAte : null,
  apto_dirigir: values.aptoDirigir,
  ativo: values.ativo,
  escalas_trabalho: values.escalas.map(mapEscalaFormToPayload),
  grupos_rota: values.gruposRota.map(mapGrupoRotaFormToPayload),
})

const buildUpdatePayload = (values: FuncionarioFormValues): FuncionarioUpdatePayload => ({
  nome_completo: values.nomeCompleto,
  email: nullIfEmpty(values.email),
  telefone: unmask(values.telefone) || null,
  logradouro: values.logradouro,
  numero: values.numero,
  complemento: nullIfEmpty(values.complemento),
  bairro: values.bairro,
  cidade: values.cidade,
  estado: values.estado,
  cep: unmask(values.cep),
  possui_cnh: values.possuiCnh,
  categoria_cnh: values.possuiCnh ? nullIfEmpty(values.categoriaCnh) : null,
  cnh_valida_ate: values.possuiCnh && values.cnhValidaAte ? values.cnhValidaAte : null,
  apto_dirigir: values.aptoDirigir,
  ativo: values.ativo,
  escalas_trabalho: values.escalas.map(mapEscalaFormToPayload),
  grupos_rota: values.gruposRota.map(mapGrupoRotaFormToPayload),
})

function FuncionarioFormPage({ mode }: FuncionarioFormPageProps) {
  const { funcionarioId } = useParams<{ funcionarioId: string }>()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [initialValues, setInitialValues] = useState<FuncionarioFormValues>()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { danger, success } = useNotification()
  const navigate = useNavigate()

  const isEditMode = mode === 'edit'
  const funcionarioIdNumber = useMemo(() => {
    if (!funcionarioId) return undefined
    const parsed = Number(funcionarioId)
    return Number.isNaN(parsed) ? undefined : parsed
  }, [funcionarioId])

  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const listaEmpresas = await empresaService.listar()
      setEmpresas(listaEmpresas)

      if (mode === 'create') {
        if (listaEmpresas.length === 0) {
          danger('Cadastre uma empresa antes de adicionar funcionarios.')
          navigate('/cadastro/funcionarios')
          return
        }
        setInitialValues(undefined)
        return
      }

      if (!funcionarioIdNumber) {
        danger('Funcionario nao informado.')
        navigate('/cadastro/funcionarios')
        return
      }

      const detalhado = await funcionarioService.obter(funcionarioIdNumber)
      setInitialValues(toFormValues(detalhado))
    } catch (err) {
      console.error(err)
      danger('Nao foi possivel carregar os dados do formulario.')
      navigate('/cadastro/funcionarios')
    } finally {
      setLoading(false)
    }
  }, [danger, funcionarioIdNumber, mode, navigate])

  useEffect(() => {
    void carregarDados()
  }, [carregarDados])

  const handleSubmit = async (values: FuncionarioFormValues) => {
    setSubmitting(true)
    try {
      if (mode === 'create') {
        await funcionarioService.criar(buildCreatePayload(values))
        success('Funcionario cadastrado com sucesso.')
      } else if (funcionarioIdNumber) {
        await funcionarioService.atualizar(funcionarioIdNumber, buildUpdatePayload(values))
        success('Funcionario atualizado com sucesso.')
      }
      navigate('/cadastro/funcionarios')
    } catch (err) {
      console.error(err)
      danger('Nao foi possivel concluir a operacao. Tente novamente.')
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate('/cadastro/funcionarios')
  }

  if (loading) {
    return (
      <section className="section">
        <p>Carregando dados do formulario...</p>
      </section>
    )
  }

  if (isEditMode && !initialValues) {
    return (
      <section className="section">
        <p>Funcionario nao encontrado.</p>
      </section>
    )
  }

  return (
    <section className="section">
      <div className="level mb-4">
        <div className="level-left">
          <div>
            <h1 className="title is-4">
              {isEditMode ? 'Editar funcionario' : 'Novo funcionario'}
            </h1>
            <p className="subtitle is-6 has-text-grey">
              {isEditMode
                ? 'Atualize as informacoes do colaborador e salve para aplicar as alteracoes.'
                : 'Preencha os campos obrigatorios para cadastrar um novo colaborador.'}
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
        <FuncionarioForm
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

export default FuncionarioFormPage

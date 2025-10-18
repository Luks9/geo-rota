import { useCallback, useEffect, useMemo, useState } from 'react'

import FuncionarioForm, { type FuncionarioFormValues } from './components/FuncionarioForm'
import FuncionarioModal from './components/FuncionarioModal'
import FuncionariosTable from './components/FuncionariosTable'
import empresaService, { type Empresa } from './services/empresaService'
import funcionarioService, {
  type Funcionario,
  type FuncionarioDetalhado,
  type FuncionarioCreatePayload,
  type FuncionarioUpdatePayload,
} from './services/funcionarioService'
import { useNotification } from '../../hooks/useNotification'

type ModalMode = 'create' | 'edit'

type ModalState = {
  open: boolean
  mode: ModalMode
  selected?: FuncionarioDetalhado
}

const defaultModalState: ModalState = {
  open: false,
  mode: 'create',
}

const nullIfEmpty = (value: string) => {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(true)
  const [loadingEmpresas, setLoadingEmpresas] = useState(true)
  const [modalState, setModalState] = useState<ModalState>(defaultModalState)
  const [submitting, setSubmitting] = useState(false)
  const { info, success, danger } = useNotification()

  const carregarEmpresas = useCallback(async () => {
    setLoadingEmpresas(true)
    try {
      const lista = await empresaService.listar()
      setEmpresas(lista)
    } catch (err) {
      console.error(err)
      danger('Falha ao carregar empresas. Tente novamente.')
    } finally {
      setLoadingEmpresas(false)
    }
  }, [danger])

  const carregarFuncionarios = useCallback(async () => {
    setLoadingFuncionarios(true)
    try {
      const lista = await funcionarioService.listar()
      setFuncionarios(lista)
    } catch (err) {
      console.error(err)
      danger('Falha ao carregar funcionarios. Tente novamente mais tarde.')
    } finally {
      setLoadingFuncionarios(false)
    }
  }, [danger])

  useEffect(() => {
    carregarEmpresas()
    carregarFuncionarios()
  }, [carregarEmpresas, carregarFuncionarios])

  const closeModal = () => {
    setModalState(defaultModalState)
    setSubmitting(false)
  }

  const openCreateModal = () => {
    if (empresas.length === 0) {
      danger('Cadastre uma empresa antes de adicionar funcionarios.')
      return
    }
    setModalState({ open: true, mode: 'create', selected: undefined })
  }

  const openEditModal = async (funcionario: Funcionario) => {
    setSubmitting(true)
    try {
      const detalhado = await funcionarioService.obter(funcionario.id)
      setModalState({ open: true, mode: 'edit', selected: detalhado })
    } catch (err) {
      console.error(err)
      danger('Nao foi possivel carregar os dados do funcionario.')
    } finally {
      setSubmitting(false)
    }
  }

  const buildCreatePayload = (values: FuncionarioFormValues): FuncionarioCreatePayload => ({
    empresa_id: Number(values.empresaId),
    nome_completo: values.nomeCompleto,
    cpf: values.cpf,
    email: nullIfEmpty(values.email),
    telefone: nullIfEmpty(values.telefone),
    logradouro: values.logradouro,
    numero: values.numero,
    complemento: nullIfEmpty(values.complemento),
    bairro: values.bairro,
    cidade: values.cidade,
    estado: values.estado,
    cep: values.cep,
    possui_cnh: values.possuiCnh,
    categoria_cnh: values.possuiCnh ? nullIfEmpty(values.categoriaCnh) : null,
    cnh_valida_ate: values.possuiCnh && values.cnhValidaAte ? values.cnhValidaAte : null,
    apto_dirigir: values.aptoDirigir,
    ativo: values.ativo,
  })

  const buildUpdatePayload = (values: FuncionarioFormValues): FuncionarioUpdatePayload => ({
    nome_completo: values.nomeCompleto,
    email: nullIfEmpty(values.email),
    telefone: nullIfEmpty(values.telefone),
    logradouro: values.logradouro,
    numero: values.numero,
    complemento: nullIfEmpty(values.complemento),
    bairro: values.bairro,
    cidade: values.cidade,
    estado: values.estado,
    cep: values.cep,
    possui_cnh: values.possuiCnh,
    categoria_cnh: values.possuiCnh ? nullIfEmpty(values.categoriaCnh) : null,
    cnh_valida_ate: values.possuiCnh && values.cnhValidaAte ? values.cnhValidaAte : null,
    apto_dirigir: values.aptoDirigir,
    ativo: values.ativo,
  })

  const handleSubmit = async (values: FuncionarioFormValues) => {
    setSubmitting(true)
    try {
      if (modalState.mode === 'create') {
        const criado = await funcionarioService.criar(buildCreatePayload(values))
        setFuncionarios((prev) => [...prev, criado])
        success('Funcionario cadastrado com sucesso.')
      } else if (modalState.mode === 'edit' && modalState.selected) {
        const atualizado = await funcionarioService.atualizar(
          modalState.selected.id,
          buildUpdatePayload(values),
        )
        setFuncionarios((prev) => prev.map((item) => (item.id === atualizado.id ? atualizado : item)))
        success('Funcionario atualizado com sucesso.')
      }
      closeModal()
    } catch (err) {
      console.error(err)
      danger('Nao foi possivel concluir a operacao. Tente novamente.')
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (funcionario: Funcionario) => {
    try {
      if (funcionario.ativo) {
        const confirmed = window.confirm(
          `Deseja realmente desativar o funcionario ${funcionario.nome_completo}?`,
        )
        if (!confirmed) return
        await funcionarioService.desativar(funcionario.id)
        setFuncionarios((prev) =>
          prev.map((item) => (item.id === funcionario.id ? { ...item, ativo: false } : item)),
        )
        info('Funcionario desativado.')
      } else {
        const atualizado = await funcionarioService.atualizar(funcionario.id, { ativo: true })
        setFuncionarios((prev) => prev.map((item) => (item.id === atualizado.id ? atualizado : item)))
        success('Funcionario reativado com sucesso.')
      }
    } catch (err) {
      console.error(err)
      danger('Falha ao alterar status do funcionario.')
    }
  }

  const modalTitle = useMemo(() => {
    if (!modalState.open) return ''
    return modalState.mode === 'create' ? 'Novo funcionario' : 'Editar funcionario'
  }, [modalState.mode, modalState.open])

  const initialFormValues = useMemo<FuncionarioFormValues | undefined>(() => {
    if (!modalState.selected) return undefined
    const funcionario = modalState.selected
    return {
      empresaId: String(funcionario.empresa_id),
      nomeCompleto: funcionario.nome_completo,
      cpf: funcionario.cpf,
      email: funcionario.email ?? '',
      telefone: funcionario.telefone ?? '',
      logradouro: funcionario.logradouro,
      numero: funcionario.numero,
      complemento: funcionario.complemento ?? '',
      bairro: funcionario.bairro,
      cidade: funcionario.cidade,
      estado: funcionario.estado,
      cep: funcionario.cep,
      possuiCnh: funcionario.possui_cnh,
      categoriaCnh: funcionario.categoria_cnh ?? '',
      cnhValidaAte: funcionario.cnh_valida_ate ?? '',
      aptoDirigir: funcionario.apto_dirigir,
      ativo: funcionario.ativo,
    }
  }, [modalState.selected])

  return (
    <section className="section">
      <div className="level">
        <div className="level-left">
          <div>
            <h1 className="title is-4">Funcionarios</h1>
            <p className="subtitle is-6 has-text-grey">
              Gerencie os colaboradores e mantenha os dados atualizados.
            </p>
          </div>
        </div>
        <div className="level-right">
          <button
            type="button"
            className="button is-success"
            onClick={openCreateModal}
            disabled={loadingEmpresas || submitting}
          >
            <span className="icon">
              <i className="fas fa-user-plus" aria-hidden="true" />
            </span>
            <span>Novo funcionario</span>
          </button>
        </div>
      </div>

      <FuncionariosTable
        funcionarios={funcionarios}
        loading={loadingFuncionarios}
        onEdit={openEditModal}
        onToggleStatus={handleToggleStatus}
      />

      <FuncionarioModal title={modalTitle} isOpen={modalState.open} onClose={closeModal}>
        <FuncionarioForm
          mode={modalState.mode}
          empresas={empresas}
          initialValues={modalState.mode === 'edit' ? initialFormValues : undefined}
          loading={submitting}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </FuncionarioModal>
    </section>
  )
}

export default FuncionariosPage

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import FuncionariosTable from './components/FuncionariosTable'
import empresaService, { type Empresa } from './services/empresaService'
import funcionarioService, { type Funcionario } from './services/funcionarioService'
import { useNotification } from '../../hooks/useNotification'

function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(true)
  const [loadingEmpresas, setLoadingEmpresas] = useState(true)
  const { info, success, danger } = useNotification()
  const navigate = useNavigate()

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

  const handleNavigateToCreate = () => {
    if (!loadingEmpresas && empresas.length === 0) {
      danger('Cadastre uma empresa antes de adicionar funcionarios.')
      return
    }
    navigate('/cadastro/funcionarios/criar')
  }

  const handleNavigateToEdit = (funcionario: Funcionario) => {
    navigate(`/cadastro/funcionarios/editar/${funcionario.id}`)
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
        setFuncionarios((prev) =>
          prev.map((item) => (item.id === atualizado.id ? { ...item, ativo: atualizado.ativo } : item)),
        )
        success('Funcionario reativado com sucesso.')
      }
    } catch (err) {
      console.error(err)
      danger('Falha ao alterar status do funcionario.')
    }
  }

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
            onClick={handleNavigateToCreate}
            disabled={loadingEmpresas}
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
        onEdit={handleNavigateToEdit}
        onToggleStatus={handleToggleStatus}
      />
    </section>
  )
}

export default FuncionariosPage

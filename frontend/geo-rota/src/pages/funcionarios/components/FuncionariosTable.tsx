import React, { useEffect, useMemo, useState } from 'react'
import ActionButtons from './ActionButtons'
import Table from '../components/tabela/Table'
import Pagination from '../components/tabela/Pagination'
import SearchInput from '../components/tabela/SearchInput'
import type { Funcionario } from '../services/funcionarioService'

const ITEMS_PER_PAGE = 10

type FuncionariosTableProps = {
  funcionarios: Funcionario[]
  loading?: boolean
  onEdit: (funcionario: Funcionario) => void
  onToggleStatus: (funcionario: Funcionario) => void
}

function FuncionariosTable({ funcionarios, loading = false, onEdit, onToggleStatus }: FuncionariosTableProps) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredFuncionarios = useMemo(() => {
    const lower = search.toLowerCase()
    return funcionarios.filter(
      (f) =>
        f.nome_completo?.toLowerCase().includes(lower) ||
        f.email?.toLowerCase().includes(lower) ||
        f.cpf?.toLowerCase().includes(lower)
    )
    
  }, [funcionarios, search])

  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredFuncionarios.length / ITEMS_PER_PAGE))
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [filteredFuncionarios.length, currentPage])

  const totalPages = Math.ceil(filteredFuncionarios.length / ITEMS_PER_PAGE)
  const paginated = filteredFuncionarios.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const columns = [
    { label: 'ID', render: (f: Funcionario) => f.id },
    { label: 'Nome completo', render: (f: Funcionario) => f.nome_completo || <span className="has-text-grey">Não informado</span> },
    { label: 'E-mail', render: (f: Funcionario) => f.email || <span className="has-text-grey">Não informado</span> },
    { label: 'Telefone', render: (f: Funcionario) => f.telefone || <span className="has-text-grey">Não informado</span> },
    { label: 'CEP', render: (f: Funcionario) => f.cep || <span className="has-text-grey">Não informado</span> },
    { label: 'CNH', render: (f: Funcionario) => f.possui_cnh ? f.categoria_cnh ?? <span className="has-text-grey">Categoria não informada</span> : <span className="has-text-grey">Sem CNH</span> },
    { label: 'Apto a dirigir', render: (f: Funcionario) => (f.apto_dirigir ? 'Sim' : 'Não') },
    {
      label: 'Status',
      render: (f: Funcionario) => (
        <span className={`tag ${f.ativo ? 'is-success is-light' : 'is-warning is-light'}`}>
          {f.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      label: 'Ações',
      className: 'has-text-right',
      render: (f: Funcionario) => (
        <ActionButtons
          isAtivo={f.ativo}
          onEdit={() => onEdit(f)}
          onToggleStatus={() => onToggleStatus(f)}
        />
      )
    }
  ]

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
        <p className="card-header-title mb-0">Lista de Funcionários</p>
        <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar..." />
      </div>

      <div className="card-content">
        <Table data={paginated} columns={columns} loading={loading} emptyMessage="Nenhum funcionário encontrado." />
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>
    </div>
  )
}

export default FuncionariosTable

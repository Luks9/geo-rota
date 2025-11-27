
import { useMemo, useState } from 'react'

import Pagination from '../../funcionarios/components/tabela/Pagination'
import SearchInput from '../../funcionarios/components/tabela/SearchInput'
import Table from '../../funcionarios/components/tabela/Table'
import type { GrupoRota } from '../services/grupoRotaService'

const ITEMS_PER_PAGE = 10

const DIA_SEMANA_OPTIONS = [
  { value: 0, label: 'Segunda-feira' },
  { value: 1, label: 'Terça-feira' },
  { value: 2, label: 'Quarta-feira' },
  { value: 3, label: 'Quinta-feira' },
  { value: 4, label: 'Sexta-feira' },
  { value: 5, label: 'Sábado' },
  { value: 6, label: 'Domingo' },
]

const formatarDias = (dias: number[]) => {
  if (!dias || dias.length === 0) {
    return <span className="has-text-grey">Todos os dias</span>
  }
  const labels = dias
    .slice()
    .sort((a, b) => a - b)
    .map((dia) => DIA_SEMANA_OPTIONS.find((option) => option.value === dia)?.label ?? `Dia ${dia}`)
  return labels.join(', ')
}

type GruposRotaTableProps = {
  grupos: GrupoRota[]
  loading?: boolean
  onEdit: (grupo: GrupoRota) => void
  onDelete: (grupo: GrupoRota) => void
}

function GruposRotaTable({ grupos, loading = false, onEdit, onDelete }: GruposRotaTableProps) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = useMemo(() => {
    const texto = search.toLowerCase()
    return grupos.filter((grupo) => grupo.nome.toLowerCase().includes(texto))
  }, [grupos, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const columns = [
    { label: 'ID', render: (grupo: GrupoRota) => grupo.id },
    { label: 'Nome', render: (grupo: GrupoRota) => grupo.nome },
    { label: 'Regime', render: (grupo: GrupoRota) => (grupo.tipo_regime === 'diario' ? 'Diário' : 'Embarque') },
    { label: 'Dias fixos', render: (grupo: GrupoRota) => formatarDias(grupo.dias_semana_padrao) },
    {
      label: 'Descrição',
      render: (grupo: GrupoRota) => grupo.descricao || <span className="has-text-grey">Sem descrição</span>,
    },
    {
      label: 'Ações',
      className: 'has-text-right',
      render: (grupo: GrupoRota) => (
        <div className="buttons is-right">
          <button type="button" className="button is-small is-link is-light" onClick={() => onEdit(grupo)}>
            <span className="icon is-small">
              <i className="fas fa-edit" aria-hidden="true" />
            </span>
            <span>Editar</span>
          </button>
          <button type="button" className="button is-small is-danger is-light" onClick={() => onDelete(grupo)}>
            <span className="icon is-small">
              <i className="fas fa-trash-alt" aria-hidden="true" />
            </span>
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="card">
      <div
        className="card-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}
      >
        <p className="card-header-title mb-0">Lista de grupos</p>
        <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar pelo nome..." />
      </div>
      <div className="card-content">
        <Table data={paginated} columns={columns} loading={loading} emptyMessage="Nenhum grupo encontrado." />
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>
    </div>
  )
}

export default GruposRotaTable

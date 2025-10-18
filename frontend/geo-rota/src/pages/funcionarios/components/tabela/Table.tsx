import React from 'react'

type TableColumn<T> = {
  label: string
  render: (item: T) => React.ReactNode
  className?: string
}

type TableProps<T> = {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  emptyMessage?: string
}

function Table<T>({ data, columns, loading = false, emptyMessage = 'Nenhum dado encontrado.' }: TableProps<T>) {
  if (loading) {
    return (
      <div className="has-text-centered p-5">
        <span className="icon is-large has-text-info">
          <i className="fas fa-circle-notch fa-spin fa-2x" aria-hidden="true" />
        </span>
        <p className="mt-2 has-text-grey">Carregando...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return <div className="notification is-info is-light">{emptyMessage}</div>
  }

  return (
    <div className="table-container">
      <table className="table is-fullwidth is-striped is-hoverable">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={col.className}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIdx) => (
            <tr key={rowIdx}>
              {columns.map((col, colIdx) => (
                <td key={colIdx}>{col.render(item)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Table

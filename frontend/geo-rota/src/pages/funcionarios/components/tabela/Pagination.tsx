import React from 'react'

type PaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav className="pagination is-centered" role="navigation" aria-label="pagination">
      <button
        className="pagination-previous button is-light"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Anterior
      </button>
      <button
        className="pagination-next button is-light"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Próximo
      </button>
      <ul className="pagination-list">
        {Array.from({ length: totalPages }).map((_, i) => (
          <li key={i}>
            <button
              className={`pagination-link ${currentPage === i + 1 ? 'is-current' : ''}`}
              onClick={() => onPageChange(i + 1)}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Pagination
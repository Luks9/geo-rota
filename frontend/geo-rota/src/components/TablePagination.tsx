import type { ChangeEvent } from "react"
import { useMemo } from "react"

const DOTS = "DOTS" as const

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50] as const

type PaginationItem = number | typeof DOTS

type TablePaginationProps = {
  currentPage: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  pageSizeOptions?: number[]
  onPageSizeChange?: (pageSize: number) => void
  showSummary?: boolean
  className?: string
  siblingCount?: number
}

const range = (start: number, end: number): number[] => {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

const getPaginationRange = (totalPages: number, currentPage: number, siblingCount: number): PaginationItem[] => {
  const totalPageNumbers = siblingCount * 2 + 5

  if (totalPages <= totalPageNumbers) {
    return range(1, totalPages)
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

  const showLeftDots = leftSiblingIndex > 2
  const showRightDots = rightSiblingIndex < totalPages - 1

  if (!showLeftDots && showRightDots) {
    const leftRange = range(1, 3 + siblingCount * 2)
    return [...leftRange, DOTS, totalPages]
  }

  if (showLeftDots && !showRightDots) {
    const rightRange = range(totalPages - (2 + siblingCount * 2), totalPages)
    return [1, DOTS, ...rightRange]
  }

  if (showLeftDots && showRightDots) {
    const middleRange = range(leftSiblingIndex, rightSiblingIndex)
    return [1, DOTS, ...middleRange, DOTS, totalPages]
  }

  return range(1, totalPages)
}

function TablePagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  pageSizeOptions = [...DEFAULT_PAGE_SIZE_OPTIONS],
  onPageSizeChange,
  showSummary = true,
  className = "",
  siblingCount = 1,
}: TablePaginationProps) {
  const safePageSize = Math.max(1, pageSize)
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize))

  const paginationRange = useMemo(
    () => getPaginationRange(totalPages, currentPage, Math.max(0, siblingCount)),
    [currentPage, siblingCount, totalPages],
  )

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * safePageSize + 1
  const endItem = totalItems === 0 ? 0 : Math.min(totalItems, currentPage * safePageSize)
  const isFirstPage = currentPage <= 1
  const isLastPage = currentPage >= totalPages

  const sanitizedPageSizeOptions = useMemo(() => {
    const uniqueOptions = [...new Set(pageSizeOptions.filter((option) => option > 0))]
    if (!uniqueOptions.includes(safePageSize)) {
      uniqueOptions.push(safePageSize)
    }
    return uniqueOptions.sort((a, b) => a - b)
  }, [pageSizeOptions, safePageSize])

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return
    onPageChange(page)
  }

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!onPageSizeChange) return
    const nextSize = Number(event.target.value)
    if (Number.isNaN(nextSize)) return
    onPageSizeChange(nextSize)
  }

  const containerClassNames = ["table-pagination", "columns", "is-mobile", "is-vcentered"]
  if (className.trim()) {
    containerClassNames.push(className.trim())
  }

  return (
    <div className={containerClassNames.join(" ")}>
      {showSummary && (
        <div className="column">
          <p className="has-text-grey is-size-7-mobile">
            Mostrando {startItem} - {endItem} de {totalItems}
          </p>
        </div>
      )}

      {onPageSizeChange && sanitizedPageSizeOptions.length > 0 && (
        <div className="column is-narrow">
          <div className="field is-grouped is-align-items-center">
            <div className="control">
              <span className="is-size-7 has-text-grey">Itens por pagina</span>
            </div>
            <div className="control">
              <div className="select is-small">
                <select value={safePageSize} onChange={handlePageSizeChange}>
                  {sanitizedPageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="column is-narrow">
        <nav className="pagination is-centered is-small" role="navigation" aria-label="Paginacao de tabela">
          <button
            type="button"
            className="pagination-previous button is-small"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={isFirstPage}
          >
            Anterior
          </button>
          <button
            type="button"
            className="pagination-next button is-small"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={isLastPage}
          >
            Proxima
          </button>
          <ul className="pagination-list">
            {paginationRange.map((item, index) => {
              if (item === DOTS) {
                return (
                  <li key={`dots-${index}`}>
                    <span className="pagination-ellipsis">...</span>
                  </li>
                )
              }

              return (
                <li key={item}>
                  <button
                    type="button"
                    className={`pagination-link${item === currentPage ? " is-current" : ""}`}
                    aria-label={`Ir para pagina ${item}`}
                    onClick={() => handlePageChange(item)}
                  >
                    {item}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}

export default TablePagination

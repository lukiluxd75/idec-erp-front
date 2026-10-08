import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

const DEFAULT_HEADER = 'whitespace-nowrap bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500'

/** Shared responsive table with consistent loading, empty, and sortable states. */
export function DataTable({
  columns,
  rows = [],
  rowKey = 'id',
  loading = false,
  emptyMessage = 'No hay datos para mostrar.',
  sortBy,
  sortDirection = 'asc',
  onSort,
  className = '',
  tableClassName = 'w-full text-left text-sm',
  rowClassName = '',
  loadingRows = 4,
  caption,
  page,
  pageSize,
  total,
  onPageChange,
  children,
}) {
  if (children) {
    return <div className={`shared-data-table w-full overflow-x-auto ${className}`}>{children}</div>
  }

  const keyFor = typeof rowKey === 'function' ? rowKey : (row) => row[rowKey]

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className={tableClassName}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((column, index) => {
              const active = sortBy === column.key
              const sortable = Boolean(column.sortable && onSort)
              const headerClassName = column.headerClassName || DEFAULT_HEADER
              return (
                <th
                  key={column.key ?? index}
                  scope="col"
                  aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={`${headerClassName} ${column.className || ''}`}
                >
                  {sortable ? (
                    <button type="button" onClick={() => onSort(column.key)} className="inline-flex items-center gap-1.5 text-inherit hover:text-slate-900">
                      {column.label}
                      {active ? (sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                    </button>
                  ) : column.label}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: loadingRows }, (_, rowIndex) => (
              <tr key={`loading-${rowIndex}`} aria-hidden="true">
                {columns.map((column, colIndex) => (
                  <td key={column.key ?? colIndex} className="px-4 py-3">
                    <span className="block h-4 animate-pulse rounded bg-slate-200/70" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={keyFor(row) ?? rowIndex} className={rowClassName}>
                {columns.map((column, colIndex) => (
                  <td key={column.key ?? colIndex} className={`px-4 py-3 text-slate-700 ${column.cellClassName || ''}`}>
                    {column.render ? column.render(row, rowIndex) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {onPageChange && Number.isFinite(total) && Number.isFinite(pageSize) && pageSize > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500" aria-label="Paginación de la tabla">
          <span>
            {total === 0 ? 'Sin resultados' : `Mostrando ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onPageChange(page - 1)} disabled={loading || page <= 1} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
              Anterior
            </button>
            <span aria-current="page">Página {page}</span>
            <button type="button" onClick={() => onPageChange(page + 1)} disabled={loading || page * pageSize >= total} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default DataTable

import { fmt } from '../api/reports.api'

/** Exact port of the standalone project's TipoPersonaMatrix -- same markup
 * and CSS classes (see ../pages/ReportsPage.css). */
export function TypeStaffMatrix({ matrix }) {
  if (!matrix.columns.length) return <p className="caption">Sin despachos en el filtro.</p>
  return (
    <div className="table-wrap">
      <table className="matrix">
        <thead>
          <tr>
            <th>Funcionario</th>
            {matrix.columns.map((c) => (
              <th key={c.procedureTypeId} className="num tipo">
                {c.description}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              {row.values.map((v, i) => (
                <td key={matrix.columns[i].procedureTypeId} className="num">
                  {v ? fmt(v) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

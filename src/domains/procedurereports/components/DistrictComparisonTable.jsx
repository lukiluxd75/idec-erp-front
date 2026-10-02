import { fmt } from '../api/reports.api'

/** Comparativa por comuna cuando el filtro abarca más de una. */
export function DistrictComparisonTable({ rows, show }) {
  if (!show || !rows?.length || rows.length < 2) return null
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Comuna</th>
            <th className="num">Funcionarios</th>
            <th className="num">Salidas</th>
            <th className="num">Trámites</th>
            <th className="num">Pendientes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.district}>
              <td>{r.district}</td>
              <td className="num">{fmt(r.staffCount)}</td>
              <td className="num">{fmt(r.dispatches)}</td>
              <td className="num">{fmt(r.procedures)}</td>
              <td className="num">{fmt(r.pending)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import { fmt } from '../api/reports.api'

const GROUP_STYLE = {
  Certificaciones: { bg: '#f4f0fb', accent: '#341a67' },
  'Registros catastrales': { bg: '#e6f7fc', accent: '#009ed0' },
  Otros: { bg: '#f3f4f6', accent: '#6b7280' },
}

/** Certificaciones vs registros catastrales (agrupación gerencial). */
export function ProcedureGroupStrip({ groups, totalDispatches }) {
  if (!groups?.length) return null
  return (
    <div className="group-strip">
      {groups.map((g) => {
        const style = GROUP_STYLE[g.group] || GROUP_STYLE.Otros
        const share = totalDispatches ? Math.round((g.dispatches / totalDispatches) * 100) : 0
        return (
          <div key={g.group} className="group-card" style={{ background: style.bg, borderColor: style.accent }}>
            <span className="group-name" style={{ color: style.accent }}>
              {g.group}
            </span>
            <b>{fmt(g.dispatches)}</b>
            <small>
              {fmt(g.procedures)} trámites · {share}% del volumen
            </small>
          </div>
        )
      })}
    </div>
  )
}

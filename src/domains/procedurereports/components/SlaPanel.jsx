import { fmt } from '../api/reports.api'
import { ReportHelpHint } from './ReportHelp'

function DeltaBadge({ delta, pct }) {
  if (delta == null) return null
  const up = delta >= 0
  const cls = up ? 'delta up' : 'delta down'
  const sign = up ? '+' : ''
  return (
    <span className={cls} title="Respecto al período anterior equivalente">
      {sign}
      {fmt(delta)} {pct != null ? `(${pct > 0 ? '+' : ''}${pct}%)` : ''}
    </span>
  )
}

/** SLA y variación vs período anterior. */
export function SlaPanel({ sla, periodComparison, kpis }) {
  const summary = sla?.summary
  const hasSla = summary?.avgDays != null
  const pc = periodComparison
  return (
    <div className="sla-strip-wrap">
      <div className="section-help-row">
        <ReportHelpHint helpId="slaStrip" label="¿Qué es el SLA y la variación?" />
      </div>
      <section className="sla-strip">
      <div className="sla-card">
        <span className="sla-label">SLA promedio (ingreso → salida)</span>
        <b>{hasSla ? `${fmt(summary.avgDays, 1)} d` : '—'}</b>
        {hasSla && (
          <small>
            Mín. {summary.minDays ?? '—'} · Máx. {summary.maxDays ?? '—'} · n={fmt(summary.sampleSize)}
          </small>
        )}
      </div>
      <div className="sla-card">
        <span className="sla-label">Salidas vs período anterior</span>
        <b>{fmt(kpis?.dispatches)}</b>
        {pc && (
          <small>
            {pc.previousStartDate} – {pc.previousEndDate}: {fmt(pc.dispatches)}{' '}
            <DeltaBadge delta={pc.dispatchesDelta} pct={pc.dispatchesDeltaPct} />
          </small>
        )}
      </div>
      <div className="sla-card">
        <span className="sla-label">Trámites distintos vs anterior</span>
        <b>{fmt(kpis?.procedures)}</b>
        {pc && (
          <small>
            Anterior: {fmt(pc.procedures)}{' '}
            <DeltaBadge delta={pc.proceduresDelta} pct={pc.proceduresDeltaPct} />
          </small>
        )}
      </div>
    </section>
    </div>
  )
}

export function SlaByTypeTable({ rows }) {
  if (!rows?.length) return <p className="caption">Sin salidas con fechas de ingreso en el período.</p>
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tipo de trámite</th>
            <th className="num">SLA prom. (días)</th>
            <th className="num">Salidas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.procedureTypeId}>
              <td>
                <span className="name-cell">
                  <span className="swatch" style={{ background: r.color }} />
                  {r.description}
                </span>
              </td>
              <td className="num">{r.avgDays != null ? fmt(r.avgDays, 1) : '—'}</td>
              <td className="num">{fmt(r.dispatches)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SlaByStaffTable({ rows }) {
  if (!rows?.length) return null
  return (
    <div className="table-wrap tall">
      <table>
        <thead>
          <tr>
            <th>Funcionario</th>
            <th>Comuna</th>
            <th className="num">SLA prom. (días)</th>
            <th className="num">Salidas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>
                <span className="name-cell">
                  <span className="swatch" style={{ background: r.color }} />
                  {r.name}
                </span>
              </td>
              <td>{r.district}</td>
              <td className="num">{r.avgDays != null ? fmt(r.avgDays, 1) : '—'}</td>
              <td className="num">{fmt(r.dispatches)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

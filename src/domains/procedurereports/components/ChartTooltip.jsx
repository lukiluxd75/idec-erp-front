import { fmt } from '../api/reports.api'

const PURPLE = '#341a67'

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => Number(p.value) > 0)
  const shown = rows.length ? rows : payload
  return (
    <div className="chart-tip">
      <div className="chart-tip-title">{label}</div>
      {shown.map((p) => (
        <div key={p.name} className="chart-tip-row">
          <span className="swatch" style={{ background: p.color || PURPLE }} />
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

export function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  const color = p.payload?.color || p.payload?.fill || PURPLE
  return (
    <div className="chart-tip">
      <div className="chart-tip-row">
        <span className="swatch" style={{ background: color }} />
        {p.name}: {fmt(p.value)}
      </div>
    </div>
  )
}

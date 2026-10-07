import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

const BUCKET_COLORS = ['#0f766e', '#009ed0', '#584291', '#b45309', '#9f1239']

/** Distribución del pendiente por antigüedad (días desde ingreso). */
export function BacklogAgingChart({ backlogAging }) {
  const hasAny = (backlogAging || []).some((b) => b.count > 0)
  if (!hasAny) {
    return <p className="caption">No hay trámites pendientes en el filtro actual.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={backlogAging} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name="Pendientes" radius={[4, 4, 0, 0]}>
          {backlogAging.map((row, i) => (
            <Cell key={row.bucket} fill={BUCKET_COLORS[i % BUCKET_COLORS.length]} />
          ))}
          <LabelList dataKey="count" position="top" fontSize={11} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

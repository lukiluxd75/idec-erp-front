import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { PieTooltip } from './ChartTooltip'

const PURPLE = '#341a67'

/** Donut chart of dispatches by procedure type. */
export function TypePieChart({ byType }) {
  const slices = byType.filter((d) => d.dispatches > 0)
  if (!slices.length) return <p className="caption">Sin despachos en el filtro.</p>
  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="dispatches"
          nameKey="description"
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={110}
          paddingAngle={1}
          label={({ percent }) => (percent && percent >= 0.06 ? `${Math.round(percent * 100)}%` : '')}
        >
          {slices.map((d) => (
            <Cell key={d.procedureTypeId} fill={d.color || PURPLE} />
          ))}
        </Pie>
        <Tooltip content={<PieTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

const PURPLE = '#341a67'

/** Horizontal bar chart, one bar per staff member, colored by their own
 * assigned color (see generate_report.py's color_at). */
export function RankingChart({ ranking }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(360, ranking.length * 22)}>
      <BarChart layout="vertical" data={ranking} margin={{ top: 8, right: 36, left: 8, bottom: 8 }}>
        <CartesianGrid stroke="#eef2f7" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 10 }} reversed />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="dispatches" name="Despachos" radius={[0, 2, 2, 0]}>
          {ranking.map((r) => (
            <Cell key={r.name} fill={r.color || PURPLE} />
          ))}
          <LabelList dataKey="dispatches" position="right" fontSize={11} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

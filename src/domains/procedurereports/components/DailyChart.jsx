import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

const PURPLE = '#341a67'
const CYAN = '#009ed0'

/** Stacked daily bar chart, one series per active staff member, with a
 * reference line at the weekday average (kpis.avgTeamPerDay). */
export function DailyChart({ days, ranking, staffDaily, average }) {
  const active = useMemo(() => ranking.filter((r) => r.dispatches > 0), [ranking])
  const data = useMemo(() => {
    const lookup = new Map(staffDaily.map((x) => [`${x.name}|${x.date}`, x.dispatches]))
    return days.map((d) => {
      const row = { ...d }
      for (const p of active) {
        row[p.name] = lookup.get(`${p.name}|${d.date}`) || 0
      }
      return row
    })
  }, [days, staffDaily, active])

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 28 }}>
        <CartesianGrid stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-40} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip content={<ChartTooltip />} />
        <ReferenceLine
          y={average}
          stroke={CYAN}
          strokeDasharray="4 4"
          label={{ value: 'prom. hábil', fill: CYAN, fontSize: 11 }}
        />
        {active.map((p) => (
          <Bar key={p.name} dataKey={p.name} name={p.name} stackId="equipo" fill={p.color || PURPLE} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

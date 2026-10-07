import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState } from '@/shared/ui'

// Same semantic colors already established on the map's own polygons/badges
// (see processedSectorsLayer.js's STATUS_STYLE and the *_BADGE maps in
// ProcessedSectorDetailModal) -- a confirmed finding is green everywhere in
// this module, not just on the map.
const VALIDATION_STATUS_LABEL = { confirmed: 'Confirmado', rejected: 'Rechazado', pending: 'Pendiente', uncertain: 'Incierto' }
const VALIDATION_STATUS_COLOR = { confirmed: '#22c55e', rejected: '#ef4444', pending: '#94a3b8', uncertain: '#f59e0b' }

const CHANGE_TYPE_LABEL = { new: 'Nueva', removed: 'Eliminada', modified: 'Cambio', unchanged: 'Sin cambio' }
const CHANGE_TYPE_COLOR = { new: '#0ea5e9', removed: '#ef4444', modified: '#f59e0b', unchanged: '#cbd5e1' }

const SECTOR_STATUS_LABEL = {
  completed: 'Procesado',
  awaiting_validation: 'Pendiente de validación',
  awaiting_manual_alignment: 'Requiere alineación',
  detecting: 'En proceso',
  error: 'Error',
}
const SECTOR_STATUS_COLOR = {
  completed: '#22c55e',
  awaiting_validation: '#f59e0b',
  awaiting_manual_alignment: '#f59e0b',
  detecting: '#94a3b8',
  error: '#ef4444',
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-semibold text-slate-700">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.color }} />
          {p.name}: <span className="font-semibold text-slate-900">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  )
}

function labeledSlices(rows, key, labelMap, colorMap) {
  return (rows || [])
    .filter((r) => r.count > 0)
    .map((r) => ({
      key: r[key],
      name: labelMap[r[key]] || r[key],
      value: r.count,
      color: colorMap[r[key]] || '#64748b',
    }))
}

export function ValidationStatusChart({ data }) {
  const slices = labeledSlices(data, 'status', VALIDATION_STATUS_LABEL, VALIDATION_STATUS_COLOR)
  if (!slices.length) return <EmptyState title="Sin datos" subtitle="Nada en este filtro." />
  return (
    <ChartCard title="Estado de validación" subtitle="Confirmado / rechazado / pendiente / incierto">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={95}
            paddingAngle={1}
            label={({ percent }) => (percent >= 0.06 ? `${Math.round(percent * 100)}%` : '')}
          >
            {slices.map((s) => (
              <Cell key={s.key} fill={s.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function ChangeTypeChart({ data }) {
  const slices = labeledSlices(data, 'change_type', CHANGE_TYPE_LABEL, CHANGE_TYPE_COLOR)
  if (!slices.length) return <EmptyState title="Sin datos" subtitle="Nada en este filtro." />
  return (
    <ChartCard title="Distribución por tipo de cambio" subtitle="Nueva / eliminada / cambio">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={95}
            paddingAngle={1}
            label={({ percent }) => (percent >= 0.06 ? `${Math.round(percent * 100)}%` : '')}
          >
            {slices.map((s) => (
              <Cell key={s.key} fill={s.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function SectorsByStatusChart({ data }) {
  const slices = labeledSlices(data, 'status', SECTOR_STATUS_LABEL, SECTOR_STATUS_COLOR)
  if (!slices.length) return <EmptyState title="Sin datos" subtitle="Nada en este filtro." />
  return (
    <ChartCard title="Sectores por estado" subtitle="Procesados vs. pendientes">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={95}
            paddingAngle={1}
            label={({ percent }) => (percent >= 0.06 ? `${Math.round(percent * 100)}%` : '')}
          >
            {slices.map((s) => (
              <Cell key={s.key} fill={s.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function DailyTrendChart({ data }) {
  if (!data?.length) return <EmptyState title="Sin datos" subtitle="Nada en este filtro." />
  return (
    <ChartCard title="Evolución temporal" subtitle="Cambios detectados por día">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name="Cambios" fill="#341a67" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function CampaignBreakdownChart({ data }) {
  const rows = (data || []).map((r) => ({
    name: r.campaign_code || 'Sin campaña',
    Nuevas: r.new,
    Eliminadas: r.removed,
    Cambio: r.modified,
  }))
  if (!rows.length) return <EmptyState title="Sin datos" subtitle="Nada en este filtro." />
  return (
    <ChartCard title="Cambios detectados por campaña" subtitle="Nuevas / eliminadas / cambio, por campaña">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} margin={{ left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Nuevas" stackId="a" fill={CHANGE_TYPE_COLOR.new} />
          <Bar dataKey="Eliminadas" stackId="a" fill={CHANGE_TYPE_COLOR.removed} />
          <Bar dataKey="Cambio" stackId="a" fill={CHANGE_TYPE_COLOR.modified} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

/** Real timeline, distinct from DailyTrendChart's raw volume bars: tracks
 * how confirmaciones/rechazos/pendientes moved day to day, not just how
 * many findings showed up. */
export function ValidationTrendChart({ data }) {
  if (!data?.length) return <EmptyState title="Sin datos" subtitle="Nada en este filtro." />
  return (
    <ChartCard
      title="Línea de tiempo de validación"
      subtitle="Confirmados / rechazados / pendientes por día"
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="confirmed"
            name="Confirmado"
            stroke={VALIDATION_STATUS_COLOR.confirmed}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="rejected"
            name="Rechazado"
            stroke={VALIDATION_STATUS_COLOR.rejected}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="pending"
            name="Pendiente"
            stroke={VALIDATION_STATUS_COLOR.pending}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

/** "Comparativa entre campañas": resueltos (confirmado+rechazado) vs
 * pendiente, por campaña -- distinct from CampaignBreakdownChart, which
 * compares DETECTION volume (nuevas/eliminadas/cambio) rather than how
 * resolved each campaign's validation work is. */
export function CampaignResolutionChart({ data }) {
  const rows = (data || []).map((r) => ({
    name: r.campaign_code || 'Sin campaña',
    Confirmado: r.confirmed,
    Rechazado: r.rejected,
    Pendiente: r.pending,
  }))
  if (!rows.length) return <EmptyState title="Sin datos" subtitle="Nada en este filtro." />
  return (
    <ChartCard title="Comparativa de resolución entre campañas" subtitle="Confirmado / rechazado / pendiente, por campaña">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} margin={{ left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Confirmado" fill={VALIDATION_STATUS_COLOR.confirmed} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Rechazado" fill={VALIDATION_STATUS_COLOR.rejected} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Pendiente" fill={VALIDATION_STATUS_COLOR.pending} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function ValidatorsTable({ data }) {
  if (!data?.length) return <EmptyState title="Sin datos" subtitle="Nadie ha validado nada en este filtro." />
  return (
    <ChartCard title="Validadores más activos" subtitle="Confirmados y rechazados por funcionario">
      <div className="overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-1.5 pr-3">Funcionario</th>
              <th className="py-1.5 pr-3">Confirmados</th>
              <th className="py-1.5 pr-3">Rechazados</th>
              <th className="py-1.5">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((v) => (
              <tr key={v.username} className="border-t border-slate-100">
                <td className="py-1.5 pr-3 font-semibold text-slate-900">{v.username}</td>
                <td className="py-1.5 pr-3 text-emerald-600">{v.confirmed}</td>
                <td className="py-1.5 pr-3 text-rose-600">{v.rejected}</td>
                <td className="py-1.5 font-semibold text-slate-700">{v.confirmed + v.rejected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { BarChart3, FileSpreadsheet, RefreshCw } from 'lucide-react'
import { Button, Card, EmptyState, Select, Spinner } from '@/shared/ui'
import { detectionApi } from '../api/detection.api'
import ExportPreviewModal from '../components/ExportPreviewModal'
import {
  CampaignBreakdownChart,
  CampaignResolutionChart,
  ChangeTypeChart,
  DailyTrendChart,
  SectorsByStatusChart,
  ValidationStatusChart,
  ValidationTrendChart,
  ValidatorsTable,
} from '../components/ReportCharts'

function StatCard({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
      <p className={`text-xl font-bold leading-none ${tone}`}>{value}</p>
      <p className="mt-1 text-[11px] font-medium text-slate-500">{label}</p>
    </div>
  )
}

/**
 * "Reportes": analysis and export for the detection module -- distinct from
 * "Mapa y detección" (doing: draw/process/validate) and "Historial"
 * (auditing/consulta, read-only). Export was relocated here unmodified in
 * an earlier phase; this phase adds the charts/stats (cambios por campaña,
 * estado de validación, tipo de cambio, evolución diaria, sectores por
 * estado, validadores más activos) -- one bundled endpoint
 * (GetDetectionReportStatsUseCase), filtered by campaña/fecha.
 *
 * "Usuarios más activos" lives here, not in Historial -- that tab stayed an
 * audit/consulta log on purpose; an activity ranking is analysis, which is
 * this tab's job (engineer's call).
 */
export default function ReportsPage() {
  const [exportOpen, setExportOpen] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [campaignFilter, setCampaignFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await detectionApi.getReportStats({
        campaignId: campaignFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      setStats(data)
    } catch (err) {
      const msg = err.message || 'No se pudieron cargar los reportes.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [campaignFilter, dateFrom, dateTo])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    detectionApi
      .listCampaigns()
      .then((list) => setCampaigns(Array.isArray(list) ? list : []))
      .catch(() => setCampaigns([]))
  }, [])

  const totals = (stats?.by_validation_status || []).reduce(
    (acc, r) => {
      acc.total += r.count
      if (r.status === 'confirmed') acc.confirmed = r.count
      if (r.status === 'rejected') acc.rejected = r.count
      if (r.status === 'pending') acc.pending = r.count
      return acc
    },
    { total: 0, confirmed: 0, rejected: 0, pending: 0 }
  )

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-800 text-white">
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Reportes</h1>
            <p className="truncate text-xs text-slate-500">
              Análisis, comparación y exportación de lo detectado
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={load} disabled={loading} icon={RefreshCw}>
          Actualizar
        </Button>
      </header>

      <Card glass={false}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Reporte de predios</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Vista previa, PDF, Excel, JSON o impresión — por campaña o todas a la vez.
            </p>
          </div>
          <Button variant="primary" size="sm" icon={FileSpreadsheet} onClick={() => setExportOpen(true)}>
            Exportar
          </Button>
        </div>
      </Card>

      <Card glass={false}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[13rem] flex-1">
            <Select label="Campaña" value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)}>
              <option value="">Todas las campañas</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-accent-500/60 focus:bg-white focus-visible:ring-2 focus-visible:ring-accent-400/40"
            />
          </div>
          <div className="w-40">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-accent-500/60 focus:bg-white focus-visible:ring-2 focus-visible:ring-accent-400/40"
            />
          </div>
          {(campaignFilter || dateFrom || dateTo) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setCampaignFilter('')
                setDateFrom('')
                setDateTo('')
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-14">
          <Spinner className="h-7 w-7" />
        </div>
      ) : error ? (
        <EmptyState title="No se pudieron cargar los reportes" subtitle={error} />
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatCard label="Total de cambios" value={totals.total} tone="text-slate-900" />
            <StatCard label="Confirmados" value={totals.confirmed} tone="text-emerald-600" />
            <StatCard label="Rechazados" value={totals.rejected} tone="text-rose-600" />
            <StatCard label="Pendientes" value={totals.pending} tone="text-slate-500" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ValidationStatusChart data={stats.by_validation_status} />
            <ChangeTypeChart data={stats.by_change_type} />
            <SectorsByStatusChart data={stats.sectors_by_status} />
            <DailyTrendChart data={stats.daily_counts} />
          </div>

          <ValidationTrendChart data={stats.daily_counts} />
          <CampaignBreakdownChart data={stats.by_campaign} />
          <CampaignResolutionChart data={stats.by_campaign} />
          <ValidatorsTable data={stats.by_validator} />
        </>
      ) : null}

      <ExportPreviewModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        campaignId={campaignFilter || null}
        dateFrom={dateFrom || undefined}
        dateTo={dateTo || undefined}
      />
    </div>
  )
}

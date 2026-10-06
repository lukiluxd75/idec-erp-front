import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { AlertTriangle, History, RefreshCw, ScanSearch, XCircle } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Select, Spinner } from '@/shared/ui'
import { detectionApi } from '../api/detection.api'
import MapSearchBox from '../components/MapSearchBox'
import ProcessedSectorDetailModal from '../components/ProcessedSectorDetailModal'

const STATUS_BADGE = {
  completed: { variant: 'success', label: 'Procesado' },
  awaiting_validation: { variant: 'warning', label: 'Pendiente de validación' },
  awaiting_manual_alignment: { variant: 'warning', label: 'Requiere alineación manual' },
  detecting: { variant: 'neutral', label: 'En proceso' },
  error: { variant: 'danger', label: 'Error' },
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'completed', label: 'Procesado' },
  { value: 'awaiting_validation', label: 'Pendiente de validación' },
  { value: 'awaiting_manual_alignment', label: 'Requiere alineación manual' },
  { value: 'detecting', label: 'En proceso' },
  { value: 'error', label: 'Error' },
]

const CHANGE_TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Todos los tipos de cambio' },
  { value: 'new', label: 'Con nuevas' },
  { value: 'removed', label: 'Con eliminadas' },
  { value: 'changed', label: 'Con cambios' },
]

function fmtDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return value
  }
}

/** A sector's own n_pending_parcels/n_affected_parcels already carry
 * everything these filters/indicators need (see ProcessedSectorMapItem) --
 * no extra backend query, just reading what's already fetched. */
function isHalfValidated(s) {
  return (s.n_pending_parcels || 0) > 0 && (s.n_pending_parcels || 0) < (s.n_affected_parcels || 0)
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none text-slate-900">{value}</p>
        <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{label}</p>
      </div>
    </div>
  )
}

/**
 * Read-only audit/consultation log of every processed sector -- who ran it,
 * what it found, how (and by whom) each parcel was validated. No map here
 * on purpose (see the engineer's spec): "Mapa y detección" already shows
 * the same polygons with the same info, and this tab's job is auditing and
 * lookup, not browsing a map a second time. No "Reprocesar", no "Continuar
 * validación", no exportar either -- all three live in "Mapa y detección"
 * (export moves to its own "Reportes" tab in a later phase); this tab never
 * resolves anything, only consults what already happened.
 */
export default function HistorialPage() {
  const [sectors, setSectors] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedSectorId, setSelectedSectorId] = useState(null)

  const [campaignFilter, setCampaignFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [changeTypeFilter, setChangeTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Campaign is the one filter resolved server-side (listProcessedSectors
  // already supports it, same call the map uses) -- the rest filter
  // client-side over that already-scoped list, see `filtered` below.
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await detectionApi.listProcessedSectors(campaignFilter || null)
      setSectors(Array.isArray(data) ? data : [])
    } catch (err) {
      const msg = err.message || 'No se pudo cargar el historial.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [campaignFilter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    detectionApi
      .listCampaigns()
      .then((list) => setCampaigns(Array.isArray(list) ? list : []))
      .catch(() => setCampaigns([]))
  }, [])

  const filtered = useMemo(() => {
    return sectors.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false
      if (changeTypeFilter === 'new' && !s.n_new_parcels) return false
      if (changeTypeFilter === 'removed' && !s.n_removed_parcels) return false
      if (changeTypeFilter === 'changed' && !s.n_changed_parcels) return false
      if (dateFrom && s.created_at && s.created_at.slice(0, 10) < dateFrom) return false
      if (dateTo && s.created_at && s.created_at.slice(0, 10) > dateTo) return false
      return true
    })
  }, [sectors, statusFilter, changeTypeFilter, dateFrom, dateTo])

  // Free audit indicators -- every field they need is already on each row
  // (see ProcessedSectorMapItem), computed over whatever the filters above
  // currently show. "Usuarios más activos" is deliberately NOT here: that
  // needs a per-validator aggregation this list doesn't carry, left for a
  // later pass instead of blocking the rest of this redesign.
  const unclosedCount = filtered.filter((s) => s.status !== 'completed').length
  const halfValidatedCount = filtered.filter(isHalfValidated).length
  const rejectedTotal = filtered.reduce((sum, s) => sum + (s.n_rejected_parcels || 0), 0)

  const hasFilters = !!(campaignFilter || statusFilter || changeTypeFilter || dateFrom || dateTo)
  function clearFilters() {
    setCampaignFilter('')
    setStatusFilter('')
    setChangeTypeFilter('')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-800 text-white">
            <History className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Historial</h1>
            <p className="truncate text-xs text-slate-500">
              Auditoría y consulta de sectores procesados — solo lectura
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={load} disabled={loading} icon={RefreshCw}>
          Actualizar
        </Button>
      </header>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <StatCard
          icon={ScanSearch}
          label="Procesos sin cerrar"
          value={unclosedCount}
          tone="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Validaciones a medias"
          value={halfValidatedCount}
          tone="bg-orange-50 text-orange-600"
        />
        <StatCard
          icon={XCircle}
          label="Cambios rechazados"
          value={rejectedTotal}
          tone="bg-rose-50 text-rose-600"
        />
      </div>

      <Card glass={false} className="!p-0 overflow-hidden">
        <div className="space-y-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
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
            <div className="min-w-[12rem] flex-1">
              <Select label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {STATUS_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-[13rem] flex-1">
              <Select
                label="Tipo de cambio"
                value={changeTypeFilter}
                onChange={(e) => setChangeTypeFilter(e.target.value)}
              >
                {CHANGE_TYPE_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-full sm:w-64">
              <MapSearchBox
                onSelectSector={(result) => setSelectedSectorId(result.sector_id)}
                onSelectParcel={(result) => setSelectedSectorId(result.sector_id)}
                onSelectCampaign={(result) => setCampaignFilter(String(result.campaign_id))}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
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
            {hasFilters && (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
            <p className="ml-auto text-xs text-slate-500">
              {filtered.length} de {sectors.length} sectores
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner className="h-6 w-6" />
          </div>
        ) : error ? (
          <div className="p-4">
            <EmptyState title="No se pudo cargar" subtitle={error} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={sectors.length === 0 ? 'Sin sectores procesados todavía' : 'Nada coincide con estos filtros'}
              subtitle={
                sectors.length === 0
                  ? 'Corra una detección desde Mapa y detección.'
                  : 'Pruebe limpiando alguno de los filtros activos.'
              }
            />
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2">Sector</th>
                  <th className="px-3 py-2">Años</th>
                  <th className="px-3 py-2">Campaña</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Cambios</th>
                  <th className="px-3 py-2">Validación</th>
                  <th className="px-3 py-2">Creado por</th>
                  <th className="px-3 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const badge = STATUS_BADGE[s.status] || { variant: 'neutral', label: s.status }
                  return (
                    <tr
                      key={s.id}
                      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                      onClick={() => setSelectedSectorId(s.id)}
                    >
                      <td className="px-3 py-2 font-semibold text-slate-900">{s.name || `#${s.id}`}</td>
                      <td className="px-3 py-2 tabular-nums text-slate-700">
                        {s.year_a} → {s.year_b}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{s.campaign_code || '—'}</td>
                      <td className="px-3 py-2">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-600">
                        +{s.n_new_parcels} / -{s.n_removed_parcels} / ~{s.n_changed_parcels}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-600">
                        <span className="font-semibold text-emerald-600">{s.n_confirmed_parcels}</span>
                        {' / '}
                        <span className="font-semibold text-rose-600">{s.n_rejected_parcels}</span>
                        {' / '}
                        <span className="font-semibold text-slate-500">{s.n_pending_parcels}</span>
                        <span className="ml-1 text-slate-400">conf/rech/pend</span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{s.created_by_username || '—'}</td>
                      <td className="px-3 py-2 text-[11px] text-slate-500">{fmtDate(s.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ProcessedSectorDetailModal
        open={!!selectedSectorId}
        sectorId={selectedSectorId}
        onClose={() => setSelectedSectorId(null)}
        allowReprocess={false}
      />
    </div>
  )
}

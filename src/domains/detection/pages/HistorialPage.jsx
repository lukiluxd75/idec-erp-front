import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { History, RefreshCw } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Spinner } from '@/shared/ui'
import { detectionApi } from '../api/detection.api'
import HistorialMap from '../components/HistorialMap'
import ProcessedSectorDetailModal from '../components/ProcessedSectorDetailModal'

const STATUS_BADGE = {
  completed: { variant: 'success', label: 'Procesado' },
  awaiting_validation: { variant: 'warning', label: 'Pendiente de validación' },
  awaiting_manual_alignment: { variant: 'warning', label: 'Requiere alineación manual' },
  detecting: { variant: 'neutral', label: 'En proceso' },
  error: { variant: 'danger', label: 'Error' },
}

function fmtDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return value
  }
}

/** Read-only history of every processed sector: who ran it, what it found, how each parcel was validated. */
export default function HistorialPage() {
  const [sectors, setSectors] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedSectorId, setSelectedSectorId] = useState(null)
  const [highlightParcelGeom, setHighlightParcelGeom] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await detectionApi.listProcessedSectors()
      setSectors(Array.isArray(data) ? data : [])
    } catch (err) {
      const msg = err.message || 'No se pudo cargar el historial.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

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
              Sectores ya procesados · quién los corrió · qué se encontró
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={load} disabled={loading} icon={RefreshCw}>
          Actualizar
        </Button>
      </header>

      <Card glass={false} className="!p-0 overflow-hidden">
        <div className="p-3">
          <HistorialMap
            processedSectors={sectors}
            onViewSectorDetail={setSelectedSectorId}
            height={420}
            highlightParcelGeom={highlightParcelGeom}
          />
        </div>
      </Card>

      <Card glass={false} className="!p-0 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <h2 className="text-sm font-bold text-slate-900">Sectores procesados</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner className="h-6 w-6" />
          </div>
        ) : error ? (
          <div className="p-4">
            <EmptyState title="No se pudo cargar" subtitle={error} />
          </div>
        ) : sectors.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Sin sectores procesados todavía" subtitle="Corra una detección desde Mapa y detección." />
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
                  <th className="px-3 py-2">Creado por</th>
                  <th className="px-3 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((s) => {
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
        onViewParcel={(parcel) => {
          setHighlightParcelGeom(parcel.parcel_geom_geojson)
          requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          })
        }}
      />
    </div>
  )
}

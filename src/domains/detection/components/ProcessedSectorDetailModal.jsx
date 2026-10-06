import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { CheckCircle2, History, MapPinned, RefreshCw } from 'lucide-react'
import { Badge, Button, EmptyState, Modal, Spinner } from '@/shared/ui'
import { detectionApi } from '../api/detection.api'

const STATUS_BADGE = {
  completed: { variant: 'success', label: 'Procesado' },
  awaiting_validation: { variant: 'warning', label: 'Pendiente de validación' },
  awaiting_manual_alignment: { variant: 'warning', label: 'Requiere alineación manual' },
  detecting: { variant: 'neutral', label: 'En proceso' },
  error: { variant: 'danger', label: 'Error' },
}

const VALIDATION_BADGE = {
  pending: { variant: 'neutral', label: 'Pendiente' },
  confirmed: { variant: 'success', label: 'Confirmado' },
  rejected: { variant: 'danger', label: 'Rechazado' },
  uncertain: { variant: 'warning', label: 'Incierto' },
}

const CHANGE_TYPE_LABEL = {
  new: 'Nueva',
  removed: 'Eliminada',
  modified: 'Cambio',
  unchanged: 'Sin cambio',
}

// Kept in sync with ParcelValidationModal's CONSTRUCTION_TYPES / the
// backend's ALLOWED_CONSTRUCTION_TYPES.
const CONSTRUCTION_TYPE_LABEL = {
  nueva_construccion: 'Construcción nueva',
  ampliacion: 'Ampliación',
  cambio_techo: 'Cambio de techo',
  muro_nuevo: 'Muro nuevo',
  demolicion: 'Demolición',
  otro: 'Otro',
}

function fmtDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return value
  }
}

/**
 * Shared detail view for a processed sector — used both by the map popup's
 * "Ver detalle" (Mapa y detección + Historial) and, with allowReprocess,
 * backs the "Reprocesar" action. Historial never passes allowReprocess (see
 * HistorialPage): that tab is read-only, only "Mapa y detección" can start a
 * new run over an already-processed area. `onResumeValidation` backs
 * "Continuar validación" (also Mapa y detección only, see its own docstring
 * on that button below) -- Historial doesn't pass it either, so the button
 * never renders there.
 *
 * `onExploreParcel(explorableParcels, startIndex)` backs clicking an
 * already-validated parcel: DetectionPage hides this modal (not closes --
 * same sectorId, so it just refetches when shown again) and shows
 * ParcelExplorePopup instead, which calls back into here on close. Pending
 * parcels are never clickable -- only confirmed/rejected ones belong in the
 * explore list (see explorableParcels below).
 */
export default function ProcessedSectorDetailModal({
  open,
  sectorId,
  onClose,
  allowReprocess = false,
  onReprocess,
  onExploreParcel,
  onResumeValidation,
}) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resuming, setResuming] = useState(false)

  useEffect(() => {
    if (!open || !sectorId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    detectionApi
      .getProcessedSectorDetail(sectorId)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'No se pudo cargar el detalle del sector.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, sectorId])

  const statusBadge = detail ? STATUS_BADGE[detail.status] || { variant: 'neutral', label: detail.status } : null
  const hasPending = !!detail?.runs?.some((run) => run.parcels.some((p) => p.validation_status === 'pending'))

  // Only already-validated parcels are explorable -- a pending finding
  // hasn't been confirmed/rejected yet and shouldn't be inspectable as if it
  // were. Flattened across every run, in the same order they're listed.
  const explorableParcels = (detail?.runs || [])
    .flatMap((run) => run.parcels)
    .filter((p) => p.parcel_geom_geojson && p.validation_status !== 'pending')

  /** Closes this modal and hands the sector's persisted result (same shape
   * as a live job_result) up to DetectionPage, which loads it into the same
   * Hallazgos table/photos a fresh detection uses and scrolls to it -- no
   * validation UI lives in this modal itself. */
  async function handleContinueValidation() {
    setResuming(true)
    try {
      const result = await detectionApi.resumeSectorValidation(sectorId)
      onResumeValidation?.(result)
      onClose?.()
    } catch (err) {
      toast.error(err.message || 'No se pudo retomar la validación de este sector.')
    } finally {
      setResuming(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={detail?.name || (sectorId ? `Sector #${sectorId}` : 'Detalle del sector')}
      icon={MapPinned}
      className="max-h-[85vh] max-w-2xl overflow-y-auto"
    >
      <>
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {!loading && error && <EmptyState title="No se pudo cargar" subtitle={error} />}

        {!loading && !error && detail && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {detail.year_a} → {detail.year_b}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {detail.campaign_code ? `Campaña ${detail.campaign_code} · ` : ''}
                  Creado por {detail.created_by_username || '—'} · {fmtDate(detail.created_at)}
                </p>
              </div>
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge variant="success">Nuevas {detail.n_new_parcels}</Badge>
              <Badge variant="danger">Eliminadas {detail.n_removed_parcels}</Badge>
              <Badge variant="warning">Cambio {detail.n_changed_parcels}</Badge>
              <Badge variant="neutral">Total {detail.n_affected_parcels}</Badge>
            </div>

            <div className="space-y-3">
              {detail.runs.map((run, idx) => (
                <div key={run.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-brand-700" />
                      <p className="text-xs font-bold text-slate-800">
                        Corrida {idx + 1} · {run.alignment_method === 'manual_gcp' ? 'Alineación manual' : 'Automática'}
                        {run.alignment_is_main && (
                          <span className="ml-1.5 text-[10px] font-semibold text-accent-600">(principal)</span>
                        )}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {run.alignment_cc != null ? `cc=${run.alignment_cc} · ` : ''}
                      {run.alignment_residual_m != null ? `residual≈${run.alignment_residual_m} m · ` : ''}
                      {fmtDate(run.created_at)}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {run.parcels.length === 0 ? (
                      <p className="text-xs text-slate-400">Sin predios en esta corrida.</p>
                    ) : (
                      run.parcels.map((p) => {
                        const vBadge = VALIDATION_BADGE[p.validation_status] || {
                          variant: 'neutral',
                          label: p.validation_status,
                        }
                        // Pending findings aren't explorable -- only
                        // confirmed/rejected ones (see explorableParcels).
                        const clickable =
                          !!(p.parcel_geom_geojson && onExploreParcel) && p.validation_status !== 'pending'
                        return (
                          <div
                            key={p.id}
                            onClick={
                              clickable
                                ? () => {
                                    const startIndex = explorableParcels.findIndex((x) => x.id === p.id)
                                    onExploreParcel(explorableParcels, startIndex < 0 ? 0 : startIndex)
                                  }
                                : undefined
                            }
                            className={`rounded-lg border border-slate-200 bg-white px-2.5 py-2 ${
                              clickable ? 'cursor-pointer transition-colors hover:border-accent-400 hover:bg-accent-50/40' : ''
                            }`}
                            title={clickable ? 'Explorar este predio en el mapa' : undefined}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <Badge variant="neutral">{CHANGE_TYPE_LABEL[p.change_type] || p.change_type}</Badge>
                                <span className="text-xs font-semibold text-slate-800">
                                  {p.cadastral_code || 'Sin código catastral'}
                                </span>
                                {clickable && <MapPinned className="h-3 w-3 text-accent-500" />}
                              </div>
                              <Badge variant={vBadge.variant}>{vBadge.label}</Badge>
                            </div>
                            {p.construction_type && (
                              <p className="mt-1 text-[11px] font-medium text-brand-700">
                                {CONSTRUCTION_TYPE_LABEL[p.construction_type] || p.construction_type}
                              </p>
                            )}
                            {p.reviews?.length > 0 && (
                              <div className="mt-1.5 space-y-1 border-t border-slate-100 pt-1.5">
                                {p.reviews.map((rv, i) => (
                                  <p key={i} className="text-[11px] text-slate-500">
                                    <span className="font-semibold text-slate-700">
                                      {rv.action === 'confirm' ? 'Confirmado' : 'Rechazado'}
                                    </span>{' '}
                                    por {rv.created_by_username || '—'} · {fmtDate(rv.created_at)}
                                    {rv.comment && (
                                      <>
                                        {' — '}
                                        <span className="italic">{rv.comment}</span>
                                      </>
                                    )}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>

            {(allowReprocess || (hasPending && onResumeValidation)) && (
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                {hasPending && onResumeValidation ? (
                  <Button
                    variant="primary"
                    icon={CheckCircle2}
                    onClick={handleContinueValidation}
                    loading={resuming}
                  >
                    Continuar validación
                  </Button>
                ) : (
                  <span />
                )}
                {allowReprocess && (
                  <Button
                    variant="warning"
                    icon={RefreshCw}
                    onClick={() => {
                      onReprocess?.(detail)
                      onClose?.()
                      toast.info('Área cargada en el mapa — ajuste los años y presione "Detectar cambios".')
                    }}
                  >
                    Reprocesar esta área
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </>
    </Modal>
  )
}

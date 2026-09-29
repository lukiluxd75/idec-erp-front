import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { CheckCircle2, Crosshair, Image as ImageIcon, Trash2 } from 'lucide-react'
import { Badge, Button, ConfirmDialog, EmptyState, Modal, Spinner } from '@/shared/ui'
import { alignmentApi } from '../api/alignment.api'

const STATUS_BADGE = {
  draft: { variant: 'warning', label: 'Borrador' },
  confirmed: { variant: 'success', label: 'Confirmado' },
}

function fmtDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return value
  }
}

/** Detail of one alignment_block: its control points, RMSE, and the
 * confirm/delete actions -- opened from AlignmentMap's overlay click or the
 * blocks table in AlignmentPage. `onPreviewResult` (optional) shows the
 * warped "after" image on the main map -- see AlignmentPage/correctedOverlay.js. */
export default function AlignmentBlockDetailModal({ open, blockId, onClose, onChanged, onPreviewResult }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  useEffect(() => {
    if (!open || !blockId) {
      setDetail(null)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setError('')
    alignmentApi
      .getBlock(blockId)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'No se pudo cargar el detalle de la manzana.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, blockId])

  async function handleConfirmBlock() {
    if (!blockId) return
    setBusy(true)
    try {
      await alignmentApi.confirmBlock(blockId)
      toast.success('Manzana confirmada.')
      onChanged?.()
      onClose?.()
    } catch (err) {
      toast.error(err.message || 'No se pudo confirmar.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteBlock() {
    if (!blockId) return
    setBusy(true)
    try {
      await alignmentApi.deleteBlock(blockId)
      toast.success('Manzana eliminada.')
      onChanged?.()
      onClose?.()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar.')
    } finally {
      setBusy(false)
    }
  }

  const statusBadge = detail ? STATUS_BADGE[detail.status] || { variant: 'neutral', label: detail.status } : null

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={detail ? `Manzana #${detail.id} · ${detail.year}` : 'Detalle de manzana'}
        icon={Crosshair}
        className="max-h-[85vh] max-w-lg overflow-y-auto"
      >
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner className="h-6 w-6" />
          </div>
        ) : error ? (
          <EmptyState title="No se pudo cargar" subtitle={error} />
        ) : detail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              {detail.rmse_m != null && <Badge variant="neutral">RMSE ≈ {detail.rmse_m} m</Badge>}
              <Badge variant="neutral">{detail.transform_method}</Badge>
            </div>

            <p className="text-xs text-slate-500">
              Creado por {detail.created_by_username || '—'} · {fmtDate(detail.created_at)}
              {detail.status === 'confirmed' && (
                <>
                  {' '}
                  · Confirmado por {detail.confirmed_by_username || '—'} · {fmtDate(detail.confirmed_at)}
                </>
              )}
            </p>

            <div>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                Puntos de control ({detail.control_points.length})
              </h3>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-2 py-1.5">#</th>
                      <th className="px-2 py-1.5">Ref (2015)</th>
                      <th className="px-2 py-1.5">Año {detail.year}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.control_points.map((p) => (
                      <tr key={p.order_index} className="border-t border-slate-100">
                        <td className="px-2 py-1.5 font-semibold">{p.order_index + 1}</td>
                        <td className="px-2 py-1.5 tabular-nums text-slate-600">
                          {p.lon_ref.toFixed(6)}, {p.lat_ref.toFixed(6)}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums text-slate-600">
                          {p.lon_mov.toFixed(6)}, {p.lat_mov.toFixed(6)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              {onPreviewResult && (
                <Button
                  variant="secondary"
                  icon={ImageIcon}
                  onClick={() => onPreviewResult(detail)}
                  disabled={busy}
                  className="mr-auto"
                >
                  Ver resultado
                </Button>
              )}
              <Button variant="danger" icon={Trash2} onClick={() => setConfirmDeleteOpen(true)} disabled={busy}>
                Eliminar
              </Button>
              {detail.status !== 'confirmed' && (
                <Button variant="primary" icon={CheckCircle2} onClick={handleConfirmBlock} loading={busy}>
                  Confirmar
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteBlock}
        title="¿Eliminar esta manzana?"
        message="Se borrará esta corrección y sus puntos de control. Esta acción no se puede deshacer."
      />
    </>
  )
}

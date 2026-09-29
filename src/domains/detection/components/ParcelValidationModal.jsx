import { useState } from 'react'
import { toast } from 'react-toastify'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button, Modal, Select } from '@/shared/ui'
import { detectionApi } from '../api/detection.api'

// Kept in sync with the backend's ALLOWED_CONSTRUCTION_TYPES (see
// ReviewAffectedParcelUseCase).
const CONSTRUCTION_TYPES = [
  { value: 'nueva_construccion', label: 'Construcción nueva' },
  { value: 'ampliacion', label: 'Ampliación' },
  { value: 'cambio_techo', label: 'Cambio de techo' },
  { value: 'muro_nuevo', label: 'Muro nuevo' },
  { value: 'demolicion', label: 'Demolición' },
  { value: 'otro', label: 'Otro' },
]

/**
 * The architect's two validation actions on an affected_parcel (see
 * ParcelValidationButtons — used from the hallazgos table). Confirming
 * requires classifying the real change (construction_type); rejecting
 * accepts an optional free-text comment kept only for audit -- why that
 * finding was dismissed. The retroalimentación/model-retraining workflow was
 * dropped entirely (alignment wasn't reliable enough for it).
 */
export default function ParcelValidationModal({ row, mode, open, onClose, onReviewed }) {
  const [busy, setBusy] = useState(false)
  const [constructionType, setConstructionType] = useState(CONSTRUCTION_TYPES[0].value)
  const [comment, setComment] = useState('')

  function reset() {
    setConstructionType(CONSTRUCTION_TYPES[0].value)
    setComment('')
  }

  function handleClose() {
    reset()
    onClose?.()
  }

  async function handleSubmit() {
    if (!row?.affected_parcel_id) return
    setBusy(true)
    try {
      const payload =
        mode === 'confirm'
          ? { action: 'confirm', construction_type: constructionType }
          : { action: 'reject', comment: comment.trim() || undefined }
      await detectionApi.reviewAffectedParcel(row.affected_parcel_id, payload)
      onReviewed?.(row.affected_parcel_id, mode === 'confirm' ? 'confirmed' : 'rejected')
      toast.success(mode === 'confirm' ? 'Detección confirmada.' : 'Detección rechazada.')
      reset()
      onClose?.()
    } catch (err) {
      toast.error(err.message || 'No se pudo registrar la validación.')
    } finally {
      setBusy(false)
    }
  }

  const isConfirm = mode === 'confirm'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isConfirm ? 'Confirmar detección' : 'Rechazar detección'}
      icon={isConfirm ? CheckCircle2 : XCircle}
    >
      <div className="space-y-3">
        {isConfirm ? (
          <>
            <p className="text-sm text-slate-600">
              Confirma que el cambio detectado es real y clasifica de qué tipo de construcción se trata.
            </p>
            <Select
              label="Tipo de cambio"
              value={constructionType}
              onChange={(e) => setConstructionType(e.target.value)}
            >
              {CONSTRUCTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Marca este predio como sin cambio real. El comentario es opcional y queda solo como registro de
              auditoría.
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Comentario (opcional)</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-accent-500/60 focus:bg-white focus-visible:ring-2 focus-visible:ring-accent-400/40"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ej: sombra de árbol clasificada como construcción nueva."
              />
            </div>
          </>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={handleClose} disabled={busy}>
            Cancelar
          </Button>
          <Button variant={isConfirm ? 'primary' : 'danger'} onClick={handleSubmit} loading={busy}>
            {isConfirm ? 'Confirmar' : 'Rechazar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

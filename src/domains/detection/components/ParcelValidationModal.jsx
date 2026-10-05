import { useState } from 'react'
import { toast } from 'react-toastify'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button, Input, Modal, Select } from '@/shared/ui'
import { detectionApi } from '../api/detection.api'

const CONSTRUCTION_TYPES = [
  { value: 'nueva_construccion', label: 'Construcción nueva' },
  { value: 'ampliacion', label: 'Ampliación' },
  { value: 'cambio_techo', label: 'Cambio de techo' },
  { value: 'muro_nuevo', label: 'Muro nuevo' },
  { value: 'demolicion', label: 'Demolición' },
  { value: 'otro', label: 'Otro' },
]

// Matches affected_parcel.construction_type's VARCHAR(30) on the backend.
const CONSTRUCTION_TYPE_MAX_LENGTH = 30

export default function ParcelValidationModal({ row, mode, open, onClose, onReviewed }) {
  const [busy, setBusy] = useState(false)
  const [constructionType, setConstructionType] = useState(CONSTRUCTION_TYPES[0].value)
  const [otherLabel, setOtherLabel] = useState('')
  const [comment, setComment] = useState('')

  const isOther = constructionType === 'otro'

  function reset() {
    setConstructionType(CONSTRUCTION_TYPES[0].value)
    setOtherLabel('')
    setComment('')
  }

  function handleClose() {
    reset()
    onClose?.()
  }

  async function handleSubmit() {
    if (!row?.affected_parcel_id) return
    if (mode === 'confirm' && isOther && !otherLabel.trim()) {
      toast.warn('Escriba el tipo de cambio observado.')
      return
    }
    setBusy(true)
    try {
      const payload =
        mode === 'confirm'
          ? { action: 'confirm', construction_type: isOther ? otherLabel.trim() : constructionType }
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
              Confirme que el cambio detectado es real y clasifique de qué tipo de construcción se trata.
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
            {isOther && (
              <Input
                label="¿Qué tipo de cambio es?"
                value={otherLabel}
                onChange={(e) => setOtherLabel(e.target.value)}
                maxLength={CONSTRUCTION_TYPE_MAX_LENGTH}
                placeholder="Ej: cambio de cerca"
              />
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Marque este predio como sin cambio real. El comentario es opcional y queda solo como registro de
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

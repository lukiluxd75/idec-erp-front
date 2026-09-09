import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

/**
 * Diálogo de confirmación genérico del design system. Se usa antes de cualquier acción
 * destructiva (borrar un registro, descartar datos). El padre controla `open` y pasa
 * `onConfirm` con la acción real; este componente solo pregunta y cierra.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = '¿Confirmar?',
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  confirmVariant = 'danger',
}) {
  const handleConfirm = () => {
    onConfirm?.()
    onClose?.()
  }

  return (
    <Modal open={open} onClose={onClose} title={title} icon={AlertTriangle}>
      <div className="space-y-4">
        {message && <p className="text-sm text-slate-600">{message}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={confirmVariant} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmDialog

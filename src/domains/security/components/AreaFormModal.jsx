import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { Modal, Input, Button } from '@/shared/ui'
import { securityActions } from '../data/securityStore'

/** Creates a new area or renames an existing one — name is always free text. */
export function AreaFormModal({ open, onClose, area }) {
  const isEditing = Boolean(area)
  const [areaName, setAreaName] = useState(area?.nombre || '')

  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmed = areaName.trim()
    if (!trimmed) {
      toast.warn('El área necesita un nombre.')
      return
    }

    setSubmitting(true)
    try {
      if (isEditing) {
        await securityActions.updateArea(area.id, trimmed)
        toast.success(`Área "${trimmed}" actualizada.`)
      } else {
        await securityActions.createArea(trimmed)
        toast.success(`Área "${trimmed}" creada.`)
      }
      onClose()
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar el área.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar área' : 'Nueva área'} icon={Building2}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre del área"
          value={areaName}
          onChange={(event) => setAreaName(event.target.value)}
          placeholder="Ej. Recursos Humanos"
          autoFocus
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear área'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AreaFormModal

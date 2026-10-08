import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { toast } from 'react-toastify'
import { Modal, Input, Button } from '@/shared/ui'
import { securityActions } from '../data/securityStore'
import { RolePermissionsCheckboxes } from './RolePermissionsCheckboxes'

/** Creates a new role or edits permissions of an existing one. */
export function RoleFormModal({ open, onClose, role }) {
  const isEditing = Boolean(role)
  const [roleName, setRoleName] = useState(role?.nombre || '')
  const [permissions, setPermissions] = useState(role?.permisos || [])
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!isEditing && !roleName.trim()) {
      toast.warn('El rol necesita un nombre.')
      return
    }

    if (permissions.length === 0) {
      toast.warn('Este rol no tiene permisos: no abrirá módulos del ERP.')
    }

    setSubmitting(true)
    try {
      if (isEditing) {
        await securityActions.updateRolePermissions(role.id, permissions)
        toast.success(`Permisos de "${role.nombre}" actualizados.`)
      } else {
        await securityActions.createRole(roleName.trim(), permissions)
        toast.success(`Rol "${roleName.trim()}" creado.`)
      }
      onClose()
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar el rol.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? `Editar permisos — ${role?.nombre}` : 'Nuevo rol'}
      icon={KeyRound}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEditing && (
          <Input
            label="Nombre del rol"
            value={roleName}
            onChange={(event) => setRoleName(event.target.value)}
            placeholder="Ej. Supervisor de Catastro"
            data-modal-initial-focus
          />
        )}

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Permisos por módulo</p>
          <p className="mb-2 text-xs text-slate-500">
            El área organiza al usuario; los permisos del rol aplican en todo el ERP.
          </p>
          <RolePermissionsCheckboxes permissions={permissions} onChange={setPermissions} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : isEditing ? 'Guardar permisos' : 'Crear rol'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default RoleFormModal

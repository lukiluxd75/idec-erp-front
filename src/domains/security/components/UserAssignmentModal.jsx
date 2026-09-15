import { useState } from 'react'
import { UserIcon, ShieldCheckIcon } from '@heroicons/react/24/solid'
import { toast } from 'react-toastify'
import { Modal, Select, Button } from '@/shared/ui'
import { securityActions } from '../data/securityStore'

/**
 * Modal to assign role(s) + area to ONE user, matching ProfileModal's visual language
 * (identity card on top, form below). Replaces the checkboxes that used to live inline
 * in the UsersPage table row: a per-user modal opens for roomier assignment with less
 * visual friction.
 *
 * Parent must mount this with a `key` that changes on each open (same as
 * RoleFormModal/AreaFormModal) so it starts clean with the current user's values.
 */
export function UserAssignmentModal({ open, onClose, user, roles, areas }) {
  const [rolIds, setRolIds] = useState(user?.rolIds || [])
  const [areaId, setAreaId] = useState(user?.areaId || '')
  const [submitting, setSubmitting] = useState(false)

  const hasRole = (id) => rolIds.includes(id)
  const toggleRole = (id) => {
    setRolIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }

  const incomplete = rolIds.length > 0 !== Boolean(areaId)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (incomplete) {
      toast.warn(rolIds.length > 0 ? 'Elija también un área para guardar.' : 'Marque también un rol para guardar.')
      return
    }

    setSubmitting(true)
    try {
      await securityActions.assignRoleArea(user.id, { rolIds, areaId })
      toast.success(`Asignación de "${user.username}" actualizada.`)
      onClose()
    } catch (error) {
      toast.error(error.message || 'No se pudo actualizar la asignación.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Asignar rol y área" icon={ShieldCheckIcon}>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-800 text-white">
          <UserIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{user?.username}</p>
          {user?.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-5">
        <Select
          label="Área"
          value={areaId}
          onChange={(event) => setAreaId(event.target.value)}
        >
          <option value="">Sin área</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.nombre}
            </option>
          ))}
        </Select>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Roles</p>
          {roles.length === 0 ? (
            <p className="text-xs text-slate-400">No hay roles creados.</p>
          ) : (
            <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto rounded-2xl border border-slate-200 p-2">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    hasRole(role.id)
                      ? 'border-accent-400/60 bg-accent-300/15 text-accent-700'
                      : 'border-transparent text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={hasRole(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="h-4 w-4 shrink-0 rounded border-slate-300 text-accent-600 focus:ring-accent-400"
                  />
                  <span className="truncate">{role.nombre}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {incomplete && (
          <p className="text-xs text-amber-600">
            {rolIds.length > 0 ? 'Elija también un área para guardar.' : 'Marque también un rol para guardar.'}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default UserAssignmentModal

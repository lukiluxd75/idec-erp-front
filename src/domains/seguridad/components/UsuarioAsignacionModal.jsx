import { useState } from 'react'
import { UserIcon, ShieldCheckIcon } from '@heroicons/react/24/solid'
import { toast } from 'react-toastify'
import { Modal, Select, Button } from '@/shared/ui'
import { seguridadActions } from '../data/seguridadStore'

/**
 * Ventana emergente para asignar rol(es) + área a UN usuario, con el mismo lenguaje
 * visual que PerfilModal (tarjeta de identidad arriba, formulario abajo). Reemplaza los
 * checkboxes que antes vivían sueltos en la fila de la tabla de UsuariosPage: acá se abre
 * un modal "de cada uno" para asignar con más espacio y menos fricción visual.
 *
 * El padre debe montar esto con una `key` que cambie en cada apertura (igual que
 * RolFormModal/AreaFormModal), así arranca limpio con los valores del usuario actual.
 */
export function UsuarioAsignacionModal({ open, onClose, usuario, roles, areas }) {
  const [rolIds, setRolIds] = useState(usuario?.rolIds || [])
  const [areaId, setAreaId] = useState(usuario?.areaId || '')
  const [enviando, setEnviando] = useState(false)

  const tieneRol = (id) => rolIds.includes(id)
  const toggleRol = (id) => {
    setRolIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }

  const incompleto = rolIds.length > 0 !== Boolean(areaId)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (incompleto) {
      toast.warn(rolIds.length > 0 ? 'Elegí también un área para guardar.' : 'Marcá también un rol para guardar.')
      return
    }

    setEnviando(true)
    try {
      await seguridadActions.asignarRolArea(usuario.id, { rolIds, areaId })
      toast.success(`Asignación de "${usuario.username}" actualizada.`)
      onClose()
    } catch (error) {
      toast.error(error.message || 'No se pudo actualizar la asignación.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Asignar rol y área" icon={ShieldCheckIcon}>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-800 text-white">
          <UserIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{usuario?.username}</p>
          {usuario?.email && <p className="truncate text-xs text-slate-500">{usuario.email}</p>}
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
              {roles.map((rol) => (
                <label
                  key={rol.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    tieneRol(rol.id)
                      ? 'border-accent-400/60 bg-accent-300/15 text-accent-700'
                      : 'border-transparent text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={tieneRol(rol.id)}
                    onChange={() => toggleRol(rol.id)}
                    className="h-4 w-4 shrink-0 rounded border-slate-300 text-accent-600 focus:ring-accent-400"
                  />
                  <span className="truncate">{rol.nombre}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {incompleto && (
          <p className="text-xs text-amber-600">
            {rolIds.length > 0 ? 'Elegí también un área para guardar.' : 'Marcá también un rol para guardar.'}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" loading={enviando}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default UsuarioAsignacionModal

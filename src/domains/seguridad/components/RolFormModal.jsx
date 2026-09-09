import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { toast } from 'react-toastify'
import { Modal, Input, Button } from '@/shared/ui'
import { seguridadActions } from '../data/seguridadStore'
import { RolPermisosCheckboxes } from './RolPermisosCheckboxes'

/**
 * Crea un rol nuevo o edita los permisos de uno existente.
 * El nombre solo se escribe a mano al crear — al editar un rol ya existente, lo único
 * que se puede tocar son sus permisos (checkboxes de módulos del ERP, nunca texto libre).
 *
 * El padre debe montar esto con una `key` que cambie en cada apertura (ver RolesPage), así
 * el formulario arranca limpio cada vez sin necesitar un efecto que resetee el estado.
 */
export function RolFormModal({ open, onClose, rol }) {
  const isEdicion = Boolean(rol)
  const [nombre, setNombre] = useState(rol?.nombre || '')
  const [permisos, setPermisos] = useState(rol?.permisos || [])

  const [enviando, setEnviando] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!isEdicion && !nombre.trim()) {
      toast.warn('El rol necesita un nombre.')
      return
    }

    setEnviando(true)
    try {
      if (isEdicion) {
        await seguridadActions.actualizarPermisosRol(rol.id, permisos)
        toast.success(`Permisos de "${rol.nombre}" actualizados.`)
      } else {
        await seguridadActions.crearRol(nombre.trim(), permisos)
        toast.success(`Rol "${nombre.trim()}" creado.`)
      }
      onClose()
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar el rol.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdicion ? `Editar permisos — ${rol?.nombre}` : 'Nuevo rol'}
      icon={KeyRound}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdicion && (
          <Input
            label="Nombre del rol"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Ej. Supervisor de Catastro"
            autoFocus
          />
        )}

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Permisos por módulo</p>
          <RolPermisosCheckboxes permisos={permisos} onChange={setPermisos} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando ? 'Guardando…' : isEdicion ? 'Guardar permisos' : 'Crear rol'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default RolFormModal

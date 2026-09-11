import { useState } from 'react'
import { KeyRound, Plus, Pencil, Trash2, Building2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { Card, SectionHeader, Button, Badge, IconButton, EmptyState, ConfirmDialog, Alert, Spinner } from '@/shared/ui'
import { useSeguridadData, seguridadActions } from '../data/seguridadStore'
import { RolFormModal } from '../components/RolFormModal'
import { AreaFormModal } from '../components/AreaFormModal'

/**
 * Catálogo de roles y áreas del ERP. Crear rol: nombre libre + permisos por checkbox.
 * Editar rol existente: solo permisos (checkbox), el nombre no se toca. Áreas: alta,
 * renombrar y baja, nombre libre (ver UsuariosPage para asignar rol+área a cada usuario).
 */
export default function RolesPage() {
  const { roles, areas, loading, error } = useSeguridadData()
  // undefined = modal cerrado, null = crear nuevo, objeto = editar ese registro
  const [rolEnEdicion, setRolEnEdicion] = useState(undefined)
  const [areaEnEdicion, setAreaEnEdicion] = useState(undefined)
  // Se incrementan en cada apertura para forzar un remount del modal (ver su comentario)
  // y que arranque limpio, sin necesitar un efecto que resetee el estado del formulario.
  const [modalToken, setModalToken] = useState(0)
  const [areaModalToken, setAreaModalToken] = useState(0)
  // null = sin confirmación pendiente, objeto = registro esperando confirmar su borrado
  const [rolPorEliminar, setRolPorEliminar] = useState(null)
  const [areaPorEliminar, setAreaPorEliminar] = useState(null)

  const abrirModalRol = (rol) => {
    setRolEnEdicion(rol)
    setModalToken((token) => token + 1)
  }

  const abrirModalArea = (area) => {
    setAreaEnEdicion(area)
    setAreaModalToken((token) => token + 1)
  }

  const handleEliminarRol = async (rol) => {
    try {
      await seguridadActions.eliminarRol(rol.id)
      toast.info(`Rol "${rol.nombre}" eliminado.`)
    } catch (error) {
      toast.error(error.message || 'No se pudo eliminar el rol.')
    }
  }

  const handleEliminarArea = async (area) => {
    try {
      await seguridadActions.eliminarArea(area.id)
      toast.info(`Área "${area.nombre}" eliminada.`)
    } catch (error) {
      toast.error(error.message || 'No se pudo eliminar el área.')
    }
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center gap-2 py-16 text-slate-500">
        <Spinner /> Cargando roles y áreas…
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <Alert type="error" title="No se pudieron cargar roles y áreas" message={error.message} />
      </Card>
    )
  }

  return (
    <>
      <Card>
        <SectionHeader icon={KeyRound} eyebrow="Roles" title="Roles y áreas" />

        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Roles ({roles.length})
            </h3>
            <Button size="sm" icon={Plus} onClick={() => abrirModalRol(null)}>
              Nuevo rol
            </Button>
          </div>

          {roles.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="Todavía no hay roles"
              subtitle="Cree el primero con el botón de arriba."
            />
          ) : (
            <ul className="space-y-2.5">
              {roles.map((rol) => (
                <li
                  key={rol.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-xs backdrop-blur-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">{rol.nombre}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {rol.permisos.length === 0 ? (
                        <span className="text-xs text-slate-400">Sin permisos asignados</span>
                      ) : (
                        rol.permisos.map((permiso) => (
                          <Badge key={permiso} variant="accent" className="font-mono">
                            {permiso}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton
                      icon={Pencil}
                      onClick={() => abrirModalRol(rol)}
                      aria-label={`Editar permisos de ${rol.nombre}`}
                    />
                    <IconButton
                      icon={Trash2}
                      tone="danger"
                      onClick={() => setRolPorEliminar(rol)}
                      aria-label={`Eliminar ${rol.nombre}`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Áreas ({areas.length})
            </h3>
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => abrirModalArea(null)}>
              Nueva área
            </Button>
          </div>

          {areas.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Todavía no hay áreas"
              subtitle="Cree la primera con el botón de arriba."
            />
          ) : (
            <ul className="space-y-2.5">
              {areas.map((area) => (
                <li
                  key={area.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-xs backdrop-blur-sm"
                >
                  <p className="min-w-0 flex-1 font-semibold text-slate-800">{area.nombre}</p>
                  <div className="flex shrink-0 gap-1">
                    <IconButton
                      icon={Pencil}
                      onClick={() => abrirModalArea(area)}
                      aria-label={`Editar ${area.nombre}`}
                    />
                    <IconButton
                      icon={Trash2}
                      tone="danger"
                      onClick={() => setAreaPorEliminar(area)}
                      aria-label={`Eliminar ${area.nombre}`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <RolFormModal
        key={modalToken}
        open={rolEnEdicion !== undefined}
        onClose={() => setRolEnEdicion(undefined)}
        rol={rolEnEdicion || undefined}
      />
      <AreaFormModal
        key={areaModalToken}
        open={areaEnEdicion !== undefined}
        onClose={() => setAreaEnEdicion(undefined)}
        area={areaEnEdicion || undefined}
      />

      <ConfirmDialog
        open={rolPorEliminar !== null}
        onClose={() => setRolPorEliminar(null)}
        onConfirm={() => handleEliminarRol(rolPorEliminar)}
        title="Eliminar rol"
        message={
          rolPorEliminar
            ? `Se eliminará el rol "${rolPorEliminar.nombre}". Los usuarios que lo tengan asignado perderán ese rol (conservan los demás que tengan).`
            : ''
        }
      />

      <ConfirmDialog
        open={areaPorEliminar !== null}
        onClose={() => setAreaPorEliminar(null)}
        onConfirm={() => handleEliminarArea(areaPorEliminar)}
        title="Eliminar área"
        message={
          areaPorEliminar
            ? `Se eliminará el área "${areaPorEliminar.nombre}". Los usuarios que la tengan asignada quedarán sin área.`
            : ''
        }
      />
    </>
  )
}

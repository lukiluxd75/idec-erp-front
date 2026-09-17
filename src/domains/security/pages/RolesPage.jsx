import { useState } from 'react'
import { KeyRound, Plus, Pencil, Trash2, Building2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { Card, SectionHeader, Button, Badge, IconButton, EmptyState, ConfirmDialog, Alert, Spinner } from '@/shared/ui'
import { useSecurityData, securityActions } from '../data/securityStore'
import { RoleFormModal } from '../components/RoleFormModal'
import { AreaFormModal } from '../components/AreaFormModal'

/**
 * ERP role and area catalog. Create role: free-text name + permission checkboxes.
 * Edit existing role: permissions only (checkboxes); name is not changed. Areas: create,
 * rename, and delete with free-text names (see UsersPage to assign role+area per user).
 */
export default function RolesPage() {
  const { roles, areas, loading, error } = useSecurityData()
  // undefined = modal closed, null = create new, object = edit that record
  const [editingRole, setEditingRole] = useState(undefined)
  const [editingArea, setEditingArea] = useState(undefined)
  // Bumped on each open to force a modal remount (see its comment) so it starts clean
  // without needing an effect that resets form state.
  const [modalToken, setModalToken] = useState(0)
  const [areaModalToken, setAreaModalToken] = useState(0)
  // null = no pending confirmation, object = record awaiting delete confirm
  const [roleToDelete, setRoleToDelete] = useState(null)
  const [areaToDelete, setAreaToDelete] = useState(null)

  const openRoleModal = (role) => {
    setEditingRole(role)
    setModalToken((token) => token + 1)
  }

  const openAreaModal = (area) => {
    setEditingArea(area)
    setAreaModalToken((token) => token + 1)
  }

  const handleDeleteRole = async (role) => {
    try {
      await securityActions.deleteRole(role.id)
      toast.info(`Rol "${role.nombre}" eliminado.`)
    } catch (error) {
      toast.error(error.message || 'No se pudo eliminar el rol.')
    }
  }

  const handleDeleteArea = async (area) => {
    try {
      await securityActions.deleteArea(area.id)
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
            <Button size="sm" icon={Plus} onClick={() => openRoleModal(null)}>
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
              {roles.map((role) => (
                <li
                  key={role.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-xs backdrop-blur-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">{role.nombre}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {role.permisos.length === 0 ? (
                        <span className="text-xs text-slate-400">Sin permisos asignados</span>
                      ) : (
                        role.permisos.map((permission) => (
                          <Badge key={permission} variant="accent" className="font-mono">
                            {permission}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton
                      icon={Pencil}
                      onClick={() => openRoleModal(role)}
                      aria-label={`Editar permisos de ${role.nombre}`}
                    />
                    <IconButton
                      icon={Trash2}
                      tone="danger"
                      onClick={() => setRoleToDelete(role)}
                      aria-label={`Eliminar ${role.nombre}`}
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
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => openAreaModal(null)}>
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
                      onClick={() => openAreaModal(area)}
                      aria-label={`Editar ${area.nombre}`}
                    />
                    <IconButton
                      icon={Trash2}
                      tone="danger"
                      onClick={() => setAreaToDelete(area)}
                      aria-label={`Eliminar ${area.nombre}`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <RoleFormModal
        key={modalToken}
        open={editingRole !== undefined}
        onClose={() => setEditingRole(undefined)}
        role={editingRole || undefined}
      />
      <AreaFormModal
        key={areaModalToken}
        open={editingArea !== undefined}
        onClose={() => setEditingArea(undefined)}
        area={editingArea || undefined}
      />

      <ConfirmDialog
        open={roleToDelete !== null}
        onClose={() => setRoleToDelete(null)}
        onConfirm={() => handleDeleteRole(roleToDelete)}
        title="Eliminar rol"
        message={
          roleToDelete
            ? `Se eliminará el rol "${roleToDelete.nombre}". Si hay usuarios con este rol asignado, no podrá eliminarse.`
            : ''
        }
      />

      <ConfirmDialog
        open={areaToDelete !== null}
        onClose={() => setAreaToDelete(null)}
        onConfirm={() => handleDeleteArea(areaToDelete)}
        title="Eliminar área"
        message={
          areaToDelete
            ? `Se eliminará el área "${areaToDelete.nombre}". Los usuarios que la tengan asignada quedarán sin área.`
            : ''
        }
      />
    </>
  )
}

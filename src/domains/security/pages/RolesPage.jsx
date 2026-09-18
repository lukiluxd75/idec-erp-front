import { useMemo, useState } from 'react'
import { KeyRound, Plus, Pencil, Trash2, Search } from 'lucide-react'
import { toast } from 'react-toastify'
import {
  Card,
  SectionHeader,
  Button,
  Badge,
  IconButton,
  EmptyState,
  ConfirmDialog,
  Alert,
  Spinner,
  Input,
} from '@/shared/ui'
import { useSecurityData, securityActions } from '../data/securityStore'
import { permissionLabel, permissionSummary } from '../data/moduleCatalog'
import { RoleFormModal } from '../components/RoleFormModal'

/**
 * Internal roles catalog and permission matrix. Areas live on /security/areas.
 */
export default function RolesPage() {
  const { roles, loading, error } = useSecurityData()
  const [editingRole, setEditingRole] = useState(undefined)
  const [modalToken, setModalToken] = useState(0)
  const [roleToDelete, setRoleToDelete] = useState(null)
  const [search, setSearch] = useState('')

  const openRoleModal = (role) => {
    setEditingRole(role)
    setModalToken((token) => token + 1)
  }

  const handleDeleteRole = async (role) => {
    try {
      await securityActions.deleteRole(role.id)
      toast.info(`Rol "${role.nombre}" eliminado.`)
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el rol.')
    }
  }

  const filteredRoles = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return roles
    return roles.filter((role) => role.nombre?.toLowerCase().includes(term))
  }, [roles, search])

  if (loading) {
    return (
      <Card className="flex items-center justify-center gap-2 py-16 text-slate-500">
        <Spinner /> Cargando roles…
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <Alert type="error" title="No se pudieron cargar los roles" message={error.message} />
      </Card>
    )
  }

  return (
    <>
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            icon={KeyRound}
            eyebrow="Seguridad"
            title="Roles"
            className="flex-1"
          />
          <Button size="sm" icon={Plus} onClick={() => openRoleModal(null)}>
            Nuevo rol
          </Button>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          Defina qué módulos puede ver o editar cada rol. Luego asígnelo a usuarios junto con un
          área.
        </p>

        {roles.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="Todavía no hay roles"
            subtitle="Cree el primero con el botón de arriba. Luego asigne permisos por módulo."
            className="mt-6"
          />
        ) : (
          <>
            <div className="mt-4">
              <Input
                icon={Search}
                placeholder="Buscar rol por nombre…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {filteredRoles.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Ningún rol coincide con la búsqueda"
                className="py-12"
              />
            ) : (
              <ul className="mt-4 space-y-2.5">
                {filteredRoles.map((role) => {
                  const codes = role.permisos || []
                  const preview = codes.slice(0, 4)
                  const extra = codes.length - preview.length
                  return (
                    <li
                      key={role.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-xs backdrop-blur-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-800">{role.nombre}</p>
                          <span className="text-xs text-slate-400">{permissionSummary(codes)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {codes.length === 0 ? (
                            <span className="text-xs text-amber-600">
                              Sin permisos — no abrirá módulos
                            </span>
                          ) : (
                            <>
                              {preview.map((code) => (
                                <span key={code} title={code}>
                                  <Badge variant="accent" className="max-w-full">
                                    <span className="truncate">{permissionLabel(code)}</span>
                                  </Badge>
                                </span>
                              ))}
                              {extra > 0 ? (
                                <Badge variant="neutral">+{extra} más</Badge>
                              ) : null}
                            </>
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
                  )
                })}
              </ul>
            )}
          </>
        )}
      </Card>

      <RoleFormModal
        key={modalToken}
        open={editingRole !== undefined}
        onClose={() => setEditingRole(undefined)}
        role={editingRole || undefined}
      />

      <ConfirmDialog
        open={roleToDelete !== null}
        onClose={() => setRoleToDelete(null)}
        onConfirm={() => handleDeleteRole(roleToDelete)}
        title="Eliminar rol"
        message={
          roleToDelete
            ? `Se eliminará el rol "${roleToDelete.nombre}". Los usuarios que lo tengan asignado perderán ese rol (conservan los demás que tengan).`
            : ''
        }
      />
    </>
  )
}

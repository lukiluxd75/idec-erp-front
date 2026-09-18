import { useMemo, useState } from 'react'
import { RefreshCw, Search, Users, Pencil, UserX, UserCheck } from 'lucide-react'
import { toast } from 'react-toastify'
import {
  Card,
  SectionHeader,
  Select,
  Input,
  EmptyState,
  Alert,
  Spinner,
  Badge,
  IconButton,
  ConfirmDialog,
} from '@/shared/ui'
import { useSecurityData, securityActions } from '../data/securityStore'
import { UserAssignmentModal } from '../components/UserAssignmentModal'

/**
 * Lists users with roles and area. Assignment opens UserAssignmentModal (role + area
 * together). Deactivation is soft (is_active) — row kept for reactivation.
 */
export default function UsersPage() {
  const { users, roles, areas, loading, error } = useSecurityData()
  const [reloading, setReloading] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editingUser, setEditingUser] = useState(undefined)
  const [modalToken, setModalToken] = useState(0)
  const [userToDeactivate, setUserToDeactivate] = useState(null)

  const openAssignmentModal = (user) => {
    setEditingUser(user)
    setModalToken((token) => token + 1)
  }

  const handleActivate = async (user) => {
    try {
      await securityActions.updateUserStatus(user.id, true)
      toast.success(`"${user.username}" fue reactivado y ya puede iniciar sesión.`)
    } catch (err) {
      toast.error(err.message || 'No se pudo reactivar el usuario.')
    }
  }

  const handleDeactivate = async (user) => {
    try {
      await securityActions.updateUserStatus(user.id, false)
      toast.info(`"${user.username}" fue desactivado. Ya no puede iniciar sesión.`)
    } catch (err) {
      toast.error(err.message || 'No se pudo desactivar el usuario.')
    }
  }

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()

    return users.filter((user) => {
      if (roleFilter && !user.rolIds.includes(roleFilter)) return false
      if (areaFilter && user.areaId !== areaFilter) return false
      if (statusFilter === 'active' && !user.activo) return false
      if (statusFilter === 'inactive' && user.activo) return false

      if (!term) return true
      return (
        user.username?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term)
      )
    })
  }, [users, search, roleFilter, areaFilter, statusFilter])

  const stats = useMemo(() => {
    const active = users.filter((user) => user.activo).length
    return {
      total: users.length,
      active,
      inactive: users.length - active,
    }
  }, [users])

  const handleReload = async () => {
    setReloading(true)
    try {
      await securityActions.reload()
    } finally {
      setReloading(false)
    }
  }

  const roleName = (id) => roles.find((role) => role.id === id)?.nombre || id
  const areaName = (id) => areas.find((area) => area.id === id)?.nombre

  if (loading) {
    return (
      <Card className="flex items-center justify-center gap-2 py-16 text-slate-500">
        <Spinner /> Cargando usuarios…
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <Alert type="error" title="No se pudieron cargar los usuarios" message={error.message} />
      </Card>
    )
  }

  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <SectionHeader icon={Users} eyebrow="Seguridad" title="Usuarios" className="flex-1" />
          <button
            type="button"
            onClick={handleReload}
            disabled={reloading}
            title="Vuelve a pedir la lista de usuarios al backend"
            className="mt-1 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${reloading ? 'animate-spin' : ''}`} />
            Recargar
          </button>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          {stats.total} usuarios · {stats.active} activos · {stats.inactive} inactivos. Los usuarios
          aparecen al primer inicio de sesión con Keycloak.
        </p>

        {users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No hay usuarios para mostrar"
            subtitle="Aparecen cuando alguien inicia sesión por primera vez."
            className="mt-6"
          />
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                icon={Search}
                placeholder="Buscar por usuario o correo…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                containerClassName="sm:col-span-2 lg:col-span-1"
              />
              <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="">Todos los roles</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.nombre}
                  </option>
                ))}
              </Select>
              <Select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}>
                <option value="">Todas las áreas</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.nombre}
                  </option>
                ))}
              </Select>
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </Select>
            </div>

            {filteredUsers.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Ningún usuario coincide con el filtro"
                className="py-12"
              />
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200/70">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Correo</th>
                      <th className="px-4 py-3">Roles</th>
                      <th className="px-4 py-3">Área</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className={`bg-white/60 ${user.activo ? '' : 'opacity-60'}`}
                      >
                        <td className="px-4 py-3 font-mono font-medium text-slate-800">
                          {user.username}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{user.email || '—'}</td>
                        <td className="px-4 py-3">
                          {user.rolIds.length === 0 ? (
                            <span className="text-xs text-slate-400">Sin roles</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {user.rolIds.map((id) => (
                                <Badge key={id} variant="accent">
                                  {roleName(id)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {areaName(user.areaId) || (
                            <span className="text-xs text-slate-400">Sin área</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.activo ? 'success' : 'danger'} dot>
                            {user.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <IconButton
                              icon={Pencil}
                              onClick={() => openAssignmentModal(user)}
                              aria-label={`Asignar rol y área a ${user.username}`}
                            />
                            {user.activo ? (
                              <IconButton
                                icon={UserX}
                                tone="danger"
                                onClick={() => setUserToDeactivate(user)}
                                aria-label={`Desactivar a ${user.username}`}
                                title="Desactivar (no podrá iniciar sesión)"
                              />
                            ) : (
                              <IconButton
                                icon={UserCheck}
                                onClick={() => handleActivate(user)}
                                aria-label={`Reactivar a ${user.username}`}
                                title="Reactivar"
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Card>

      <UserAssignmentModal
        key={modalToken}
        open={editingUser !== undefined}
        onClose={() => setEditingUser(undefined)}
        user={editingUser}
        roles={roles}
        areas={areas}
      />

      <ConfirmDialog
        open={userToDeactivate !== null}
        onClose={() => setUserToDeactivate(null)}
        onConfirm={() => handleDeactivate(userToDeactivate)}
        title="Desactivar usuario"
        message={
          userToDeactivate
            ? `"${userToDeactivate.username}" no podrá iniciar sesión mientras esté inactivo. Conservará su rol y área asignados; podrá reactivarlo en cualquier momento desde esta pantalla.`
            : ''
        }
        confirmLabel="Desactivar"
      />
    </>
  )
}

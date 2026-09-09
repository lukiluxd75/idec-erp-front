import { useMemo, useState } from 'react'
import { RefreshCw, Search, Users, Pencil, UserX, UserCheck } from 'lucide-react'
import { toast } from 'react-toastify'
import { Card, SectionHeader, Select, Input, EmptyState, Alert, Spinner, Badge, IconButton, ConfirmDialog } from '@/shared/ui'
import { useSeguridadData, seguridadActions } from '../data/seguridadStore'
import { UsuarioAsignacionModal } from '../components/UsuarioAsignacionModal'

/**
 * Lista de usuarios con sus roles y área actuales. Asignar rol(es) + área ya no se hace
 * con checkboxes sueltos en la fila: se abre una ventana emergente por usuario
 * (UsuarioAsignacionModal, mismo lenguaje visual que PerfilModal) donde se elige el área y
 * los roles juntos y se guardan de una sola vez. Ambos solo ofrecen roles/áreas que ya
 * existen (se crean en RolesPage), nunca texto libre acá.
 *
 * Dar de baja a un usuario nunca borra su fila: se lo marca como inactivo
 * (usuario.activo, CLAUDE.md §6) y el backend le rechaza el login mientras esté así. Se
 * lo sigue listando (más abajo, atenuado) para poder reactivarlo — conserva el rol/área
 * que ya tenía.
 */
export default function UsuariosPage() {
  const { usuarios, roles, areas, loading, error } = useSeguridadData()
  const [recargando, setRecargando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [rolFiltro, setRolFiltro] = useState('')
  // undefined = modal cerrado, objeto = usuario que se está editando
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState(undefined)
  // Se incrementa en cada apertura para forzar un remount del modal (ver su comentario)
  // y que arranque limpio con los valores del usuario actual.
  const [modalToken, setModalToken] = useState(0)
  // null = sin confirmación pendiente, objeto = usuario esperando confirmar su desactivación
  const [usuarioPorDesactivar, setUsuarioPorDesactivar] = useState(null)

  const abrirModalAsignacion = (usuario) => {
    setUsuarioEnEdicion(usuario)
    setModalToken((token) => token + 1)
  }

  const handleActivar = async (usuario) => {
    try {
      await seguridadActions.actualizarEstadoUsuario(usuario.id, true)
      toast.success(`"${usuario.username}" fue reactivado y ya puede iniciar sesión.`)
    } catch (error) {
      toast.error(error.message || 'No se pudo reactivar el usuario.')
    }
  }

  const handleDesactivar = async (usuario) => {
    try {
      await seguridadActions.actualizarEstadoUsuario(usuario.id, false)
      toast.info(`"${usuario.username}" fue desactivado. Ya no puede iniciar sesión.`)
    } catch (error) {
      toast.error(error.message || 'No se pudo desactivar el usuario.')
    }
  }

  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()

    return usuarios.filter((usuario) => {
      if (rolFiltro && !usuario.rolIds.includes(rolFiltro)) return false

      if (!termino) return true
      return (
        usuario.username?.toLowerCase().includes(termino) ||
        usuario.email?.toLowerCase().includes(termino)
      )
    })
  }, [usuarios, busqueda, rolFiltro])

  const handleRecargar = async () => {
    setRecargando(true)
    try {
      await seguridadActions.recargar()
    } finally {
      setRecargando(false)
    }
  }

  const nombreDeRol = (id) => roles.find((rol) => rol.id === id)?.nombre || id
  const nombreDeArea = (id) => areas.find((area) => area.id === id)?.nombre

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
            onClick={handleRecargar}
            disabled={recargando}
            title="Vuelve a pedir la lista de usuarios al backend (por si alguien se logueó recién)"
            className="mt-1 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${recargando ? 'animate-spin' : ''}`} />
            Recargar
          </button>
        </div>

        {usuarios.length === 0 ? (
          <EmptyState icon={Users} title="No hay usuarios para mostrar" />
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <Input
                icon={Search}
                placeholder="Buscar por usuario o correo…"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                containerClassName="flex-1"
              />
              <Select
                value={rolFiltro}
                onChange={(event) => setRolFiltro(event.target.value)}
                containerClassName="sm:w-56"
              >
                <option value="">Todos los roles</option>
                {roles.map((rol) => (
                  <option key={rol.id} value={rol.id}>
                    {rol.nombre}
                  </option>
                ))}
              </Select>
            </div>

            {usuariosFiltrados.length === 0 ? (
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
                    {usuariosFiltrados.map((usuario) => (
                      <tr key={usuario.id} className={`bg-white/60 ${usuario.activo ? '' : 'opacity-60'}`}>
                        <td className="px-4 py-3 font-mono font-medium text-slate-800">{usuario.username}</td>
                        <td className="px-4 py-3 text-slate-600">{usuario.email}</td>
                        <td className="px-4 py-3">
                          {usuario.rolIds.length === 0 ? (
                            <span className="text-xs text-slate-400">Sin roles</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {usuario.rolIds.map((id) => (
                                <Badge key={id} variant="accent">
                                  {nombreDeRol(id)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {nombreDeArea(usuario.areaId) || <span className="text-xs text-slate-400">Sin área</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={usuario.activo ? 'success' : 'danger'} dot>
                            {usuario.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <IconButton
                              icon={Pencil}
                              onClick={() => abrirModalAsignacion(usuario)}
                              aria-label={`Asignar rol y área a ${usuario.username}`}
                            />
                            {usuario.activo ? (
                              <IconButton
                                icon={UserX}
                                tone="danger"
                                onClick={() => setUsuarioPorDesactivar(usuario)}
                                aria-label={`Desactivar a ${usuario.username}`}
                                title="Desactivar (no podrá iniciar sesión)"
                              />
                            ) : (
                              <IconButton
                                icon={UserCheck}
                                onClick={() => handleActivar(usuario)}
                                aria-label={`Reactivar a ${usuario.username}`}
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

      <UsuarioAsignacionModal
        key={modalToken}
        open={usuarioEnEdicion !== undefined}
        onClose={() => setUsuarioEnEdicion(undefined)}
        usuario={usuarioEnEdicion}
        roles={roles}
        areas={areas}
      />

      <ConfirmDialog
        open={usuarioPorDesactivar !== null}
        onClose={() => setUsuarioPorDesactivar(null)}
        onConfirm={() => handleDesactivar(usuarioPorDesactivar)}
        title="Desactivar usuario"
        message={
          usuarioPorDesactivar
            ? `"${usuarioPorDesactivar.username}" no va a poder iniciar sesión mientras esté inactivo. Conserva su rol y área asignados — se pueden reactivar en cualquier momento desde acá.`
            : ''
        }
        confirmLabel="Desactivar"
      />
    </>
  )
}

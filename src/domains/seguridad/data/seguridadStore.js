import { useEffect, useSyncExternalStore } from 'react'
import { seguridadApi } from '../api/seguridad.api'

/**
 * Store del dominio seguridad — vive como singleton de módulo, fuera del árbol de React,
 * para que UsuariosPage y RolesPage compartan el mismo estado (roles/áreas/usuarios) aunque
 * el router desmonte una página al navegar a la otra. Se recarga desde el backend real
 * (backend/app/domains/seguridad, ver seguridad.api.js) al primer montaje; se pierde al
 * recargar la pestaña, que es correcto: el backend es la fuente de verdad.
 */
let state = { roles: [], areas: [], usuarios: [], loading: true, error: null }
let cargaIniciada = false
const listeners = new Set()

function setState(updater) {
  state = { ...state, ...updater(state) }
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

async function cargar() {
  setState(() => ({ loading: true, error: null }))
  try {
    const [roles, areas, usuarios] = await Promise.all([
      seguridadApi.listarRoles(),
      seguridadApi.listarAreas(),
      seguridadApi.listarUsuarios(),
    ])
    setState(() => ({ roles, areas, usuarios, loading: false }))
  } catch (error) {
    setState(() => ({ loading: false, error }))
  }
}

function recargar() {
  return cargar()
}

export function useSeguridadData() {
  const data = useSyncExternalStore(subscribe, () => state)

  useEffect(() => {
    if (!cargaIniciada) {
      cargaIniciada = true
      cargar()
    }
  }, [])

  return data
}

export const seguridadActions = {
  // Vuelve a pedir roles/áreas/usuarios al backend. Necesario porque `cargar()` solo se
  // dispara sola una vez por pestaña (ver comentario de arriba): si un usuario nuevo se
  // loguea al ERP mientras esta pantalla ya está abierta, no aparece hasta refrescar.
  recargar,

  async crearRol(nombre, permisos = []) {
    const rol = await seguridadApi.crearRol(nombre, permisos)
    setState((s) => ({ roles: [...s.roles, rol] }))
    return rol
  },

  async actualizarPermisosRol(rolId, permisos) {
    const rol = await seguridadApi.actualizarPermisosRol(rolId, permisos)
    setState((s) => ({ roles: s.roles.map((r) => (r.id === rolId ? rol : r)) }))
    return rol
  },

  async eliminarRol(rolId) {
    await seguridadApi.eliminarRol(rolId)
    setState((s) => ({
      roles: s.roles.filter((r) => r.id !== rolId),
      // Limpia el rol de cualquier usuario que lo tuviera asignado para no dejar
      // referencias colgadas (UsuariosPage ya no lo listaría entre sus roles).
      usuarios: s.usuarios.map((u) => ({ ...u, rolIds: u.rolIds.filter((id) => id !== rolId) })),
    }))
  },

  async crearArea(nombre) {
    const area = await seguridadApi.crearArea(nombre)
    setState((s) => ({ areas: [...s.areas, area] }))
    return area
  },

  async actualizarArea(areaId, nombre) {
    const area = await seguridadApi.actualizarArea(areaId, nombre)
    setState((s) => ({ areas: s.areas.map((a) => (a.id === areaId ? area : a)) }))
    return area
  },

  async eliminarArea(areaId) {
    await seguridadApi.eliminarArea(areaId)
    setState((s) => ({
      areas: s.areas.filter((a) => a.id !== areaId),
      // Limpia el área de cualquier usuario que la tuviera asignada para no dejar
      // referencias colgadas (UsuariosPage la mostraría como "Sin área").
      usuarios: s.usuarios.map((u) => (u.areaId === areaId ? { ...u, areaId: '' } : u)),
    }))
  },

  async asignarRolArea(usuarioId, { rolIds, areaId }) {
    const usuario = await seguridadApi.asignarRolArea(usuarioId, { rolIds, areaId })
    setState((s) => ({ usuarios: s.usuarios.map((u) => (u.id === usuarioId ? usuario : u)) }))
    return usuario
  },

  async actualizarEstadoUsuario(usuarioId, activo) {
    const usuario = await seguridadApi.actualizarEstadoUsuario(usuarioId, activo)
    setState((s) => ({ usuarios: s.usuarios.map((u) => (u.id === usuarioId ? usuario : u)) }))
    return usuario
  },
}

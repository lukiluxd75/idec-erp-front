import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'

const ENDPOINTS = API_ENDPOINTS.SEGURIDAD

/**
 * Adaptadores entre la forma de la API real (backend/app/domains/seguridad,
 * campos en snake_case) y la forma que ya esperan RolesPage/UsuariosPage/los modales
 * (heredada del store mock que reemplaza este cliente, ver seguridadStore.js).
 */
function mapRol(rol) {
  return { id: rol.id, nombre: rol.nombre, permisos: rol.permisos || [] }
}

function mapArea(area) {
  return { id: area.id, nombre: area.nombre }
}

function mapUsuario(usuario) {
  return {
    id: usuario.id,
    username: usuario.username,
    email: usuario.correo || '',
    rolIds: (usuario.roles || []).map((rol) => rol.id),
    areaId: usuario.area_id || '',
    activo: usuario.activo !== false,
  }
}

function listarRoles() {
  return httpClient.get(ENDPOINTS.ROLES).then((roles) => roles.map(mapRol))
}

function crearRol(nombre, permisos = []) {
  return httpClient.post(ENDPOINTS.ROLES, { nombre, permisos }).then(mapRol)
}

function actualizarPermisosRol(rolId, permisos) {
  return httpClient.put(ENDPOINTS.ROL_PERMISOS(rolId), { permisos }).then(mapRol)
}

function eliminarRol(rolId) {
  return httpClient.delete(ENDPOINTS.ROL(rolId))
}

function listarAreas() {
  return httpClient.get(ENDPOINTS.AREAS).then((areas) => areas.map(mapArea))
}

function crearArea(nombre) {
  return httpClient.post(ENDPOINTS.AREAS, { nombre }).then(mapArea)
}

function actualizarArea(areaId, nombre) {
  return httpClient.put(ENDPOINTS.AREA(areaId), { nombre }).then(mapArea)
}

function eliminarArea(areaId) {
  return httpClient.delete(ENDPOINTS.AREA(areaId))
}

function listarUsuarios() {
  return httpClient.get(ENDPOINTS.USUARIOS).then((usuarios) => usuarios.map(mapUsuario))
}

function asignarRolArea(usuarioId, { rolIds, areaId }) {
  return httpClient
    .put(ENDPOINTS.USUARIO_ASIGNACION(usuarioId), { rol_ids: rolIds || [], area_id: areaId || null })
    .then(mapUsuario)
}

/**
 * Activa/desactiva un usuario (usuario.activo) en vez de borrarlo — CLAUDE.md §6 pide
 * soft delete para usuarios. Un usuario inactivo no puede volver a iniciar sesión
 * (lo rechaza el backend en /login y en cada request, ver deps.get_current_user).
 */
function actualizarEstadoUsuario(usuarioId, activo) {
  return httpClient.put(ENDPOINTS.USUARIO_ESTADO(usuarioId), { activo }).then(mapUsuario)
}

export const seguridadApi = {
  listarRoles,
  crearRol,
  actualizarPermisosRol,
  eliminarRol,
  listarAreas,
  crearArea,
  actualizarArea,
  eliminarArea,
  listarUsuarios,
  asignarRolArea,
  actualizarEstadoUsuario,
}

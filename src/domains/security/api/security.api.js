import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'

const ENDPOINTS = API_ENDPOINTS.SECURITY

/**
 * Adapters between the real API shape (backend/app/domains/security, snake_case fields)
 * and the shape already expected by RolesPage/UsersPage/modals (inherited from the mock
 * store this client replaces; see securityStore.js).
 */
function mapRole(role) {
  return { id: role.id, nombre: role.nombre, permisos: role.permisos || [] }
}

function mapArea(area) {
  return { id: area.id, nombre: area.nombre }
}

function mapUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.correo || '',
    rolIds: (user.roles || []).map((role) => role.id),
    areaId: user.area_id || '',
    activo: user.activo !== false,
  }
}

function listRoles() {
  return httpClient.get(ENDPOINTS.ROLES).then((roles) => roles.map(mapRole))
}

function createRole(name, permissions = []) {
  return httpClient.post(ENDPOINTS.ROLES, { nombre: name, permisos: permissions }).then(mapRole)
}

function updateRolePermissions(roleId, permissions) {
  return httpClient.put(ENDPOINTS.ROLE_PERMISSIONS(roleId), { permisos: permissions }).then(mapRole)
}

function deleteRole(roleId) {
  return httpClient.delete(ENDPOINTS.ROLE(roleId))
}

function listAreas() {
  return httpClient.get(ENDPOINTS.AREAS).then((areas) => areas.map(mapArea))
}

function createArea(name) {
  return httpClient.post(ENDPOINTS.AREAS, { nombre: name }).then(mapArea)
}

function updateArea(areaId, name) {
  return httpClient.put(ENDPOINTS.AREA(areaId), { nombre: name }).then(mapArea)
}

function deleteArea(areaId) {
  return httpClient.delete(ENDPOINTS.AREA(areaId))
}

function listUsers() {
  return httpClient.get(ENDPOINTS.USERS).then((users) => users.map(mapUser))
}

function assignRoleArea(userId, { rolIds, areaId }) {
  return httpClient
    .put(ENDPOINTS.USER_ASSIGNMENT(userId), { role_ids: rolIds || [], area_id: areaId || null })
    .then(mapUser)
}

/**
 * Activates/deactivates a user (usuario.activo) instead of deleting — CLAUDE.md §6 asks
 * for soft delete on users. An inactive user cannot log in again (backend rejects at
 * /login and on each request; see deps.get_current_user).
 */
function updateUserStatus(userId, active) {
  return httpClient.put(ENDPOINTS.USER_STATUS(userId), { activo: active }).then(mapUser)
}

export const securityApi = {
  listRoles,
  createRole,
  updateRolePermissions,
  deleteRole,
  listAreas,
  createArea,
  updateArea,
  deleteArea,
  listUsers,
  assignRoleArea,
  updateUserStatus,
}

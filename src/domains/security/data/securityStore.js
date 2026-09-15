import { useEffect, useSyncExternalStore } from 'react'
import { securityApi } from '../api/security.api'

/**
 * Security-domain store — module singleton outside the React tree so UsersPage and
 * RolesPage share the same state (roles/areas/users) even when the router unmounts one
 * page while navigating to the other. Reloaded from the real backend
 * (backend/app/domains/security, see security.api.js) on first mount; lost on tab reload,
 * which is correct: the backend is the source of truth.
 */
let state = { roles: [], areas: [], users: [], loading: true, error: null }
let loadStarted = false
const listeners = new Set()

function setState(updater) {
  state = { ...state, ...updater(state) }
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

async function load() {
  setState(() => ({ loading: true, error: null }))
  try {
    const [roles, areas, users] = await Promise.all([
      securityApi.listRoles(),
      securityApi.listAreas(),
      securityApi.listUsers(),
    ])
    setState(() => ({ roles, areas, users, loading: false }))
  } catch (error) {
    setState(() => ({ loading: false, error }))
  }
}

function reload() {
  return load()
}

export function useSecurityData() {
  const data = useSyncExternalStore(subscribe, () => state)

  useEffect(() => {
    if (!loadStarted) {
      loadStarted = true
      load()
    }
  }, [])

  return data
}

export const securityActions = {
  // Re-fetches roles/areas/users from the backend. Needed because `load()` only runs once
  // per tab (see comment above): if a new user logs into the ERP while this screen is
  // already open, they will not appear until refresh.
  reload,

  async createRole(name, permissions = []) {
    const role = await securityApi.createRole(name, permissions)
    setState((s) => ({ roles: [...s.roles, role] }))
    return role
  },

  async updateRolePermissions(roleId, permissions) {
    const role = await securityApi.updateRolePermissions(roleId, permissions)
    setState((s) => ({ roles: s.roles.map((r) => (r.id === roleId ? role : r)) }))
    return role
  },

  async deleteRole(roleId) {
    await securityApi.deleteRole(roleId)
    setState((s) => ({
      roles: s.roles.filter((r) => r.id !== roleId),
      // Clear the role from any user that had it assigned to avoid dangling references
      // (UsersPage would otherwise still list it among their roles).
      users: s.users.map((u) => ({ ...u, rolIds: u.rolIds.filter((id) => id !== roleId) })),
    }))
  },

  async createArea(name) {
    const area = await securityApi.createArea(name)
    setState((s) => ({ areas: [...s.areas, area] }))
    return area
  },

  async updateArea(areaId, name) {
    const area = await securityApi.updateArea(areaId, name)
    setState((s) => ({ areas: s.areas.map((a) => (a.id === areaId ? area : a)) }))
    return area
  },

  async deleteArea(areaId) {
    await securityApi.deleteArea(areaId)
    setState((s) => ({
      areas: s.areas.filter((a) => a.id !== areaId),
      // Clear the area from any user that had it assigned to avoid dangling references
      // (UsersPage would otherwise show it as "Sin área").
      users: s.users.map((u) => (u.areaId === areaId ? { ...u, areaId: '' } : u)),
    }))
  },

  async assignRoleArea(userId, { rolIds, areaId }) {
    const user = await securityApi.assignRoleArea(userId, { rolIds, areaId })
    setState((s) => ({ users: s.users.map((u) => (u.id === userId ? user : u)) }))
    return user
  },

  async updateUserStatus(userId, active) {
    const user = await securityApi.updateUserStatus(userId, active)
    setState((s) => ({ users: s.users.map((u) => (u.id === userId ? user : u)) }))
    return user
  },
}

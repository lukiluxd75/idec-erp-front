import { NAV_SECTIONS } from '@/shared/nav'

/**
 * ERP module catalog used to build permissions, derived from NAV_SECTIONS (Home is
 * excluded because it is not a business module). Keeps a role's permission checklist
 * aligned with what actually exists in the ERP, instead of a separate hardcoded list
 * that can drift out of sync.
 *
 * The real per-module action catalog is not defined yet (see CLAUDE.md §10), so a generic
 * view/edit pair is used as a placeholder.
 */
export const ERP_MODULES = NAV_SECTIONS.filter((section) => section.path !== '/dashboard').map(
  (section) => ({
    id: section.path.replace('/', ''),
    label: section.label,
  })
)

export const ACTIONS = [
  { id: 'view', label: 'Ver' },
  { id: 'edit', label: 'Editar' },
]

/**
 * Everything below is in-memory sample data — the security backend (roles, areas,
 * usuario_rol_area) is not wired into this module yet. See securityStore.js.
 */
export const INITIAL_ROLES = [
  {
    id: 'rol-admin',
    nombre: 'Administrador',
    permisos: ['geoextraction.view', 'geoextraction.edit', 'security.view', 'security.edit'],
  },
  {
    id: 'rol-operador',
    nombre: 'Operador OCR',
    permisos: ['geoextraction.view', 'geoextraction.edit'],
  },
  {
    id: 'rol-lector',
    nombre: 'Solo lectura',
    permisos: ['geoextraction.view', 'security.view'],
  },
]

export const INITIAL_AREAS = [
  { id: 'area-sistemas', nombre: 'Sistemas' },
  { id: 'area-catastro', nombre: 'Catastro' },
  { id: 'area-administracion', nombre: 'Administración' },
]

export const INITIAL_USERS = [
  { id: 'usuario-demo-1', username: 'usuario.demo1', email: 'demo1@gamc.gob.bo', rolId: 'rol-admin', areaId: 'area-sistemas' },
  { id: 'usuario-demo-2', username: 'usuario.demo2', email: 'demo2@gamc.gob.bo', rolId: 'rol-operador', areaId: 'area-catastro' },
  { id: 'usuario-demo-3', username: 'usuario.demo3', email: 'demo3@gamc.gob.bo', rolId: '', areaId: '' },
]

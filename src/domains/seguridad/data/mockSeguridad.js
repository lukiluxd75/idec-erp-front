import { NAV_SECTIONS } from '@/shared/nav'

/**
 * Catálogo de módulos del ERP para armar permisos, derivado de NAV_SECTIONS (Inicio no
 * se incluye porque no es un módulo de negocio). Así el checklist de permisos de un rol
 * siempre coincide con lo que realmente existe en el ERP, en vez de una lista hardcodeada
 * aparte que se puede desincronizar.
 *
 * El catálogo real de acciones por módulo todavía no está definido (ver CLAUDE.md §10),
 * así que por ahora se usa un par genérico ver/editar como placeholder.
 */
export const MODULOS_ERP = NAV_SECTIONS.filter((section) => section.path !== '/dashboard').map(
  (section) => ({
    id: section.path.replace('/', ''),
    label: section.label,
  })
)

export const ACCIONES = [
  { id: 'ver', label: 'Ver' },
  { id: 'editar', label: 'Editar' },
]

/**
 * Todo lo de acá abajo es data de ejemplo en memoria — el backend de seguridad (roles,
 * áreas, usuario_rol_area) todavía no está conectado a este módulo. Ver seguridadStore.js.
 */
export const ROLES_INICIALES = [
  {
    id: 'rol-admin',
    nombre: 'Administrador',
    permisos: ['geoextraccion.ver', 'geoextraccion.editar', 'seguridad.ver', 'seguridad.editar'],
  },
  {
    id: 'rol-operador',
    nombre: 'Operador OCR',
    permisos: ['geoextraccion.ver', 'geoextraccion.editar'],
  },
  {
    id: 'rol-lector',
    nombre: 'Solo lectura',
    permisos: ['geoextraccion.ver', 'seguridad.ver'],
  },
]

export const AREAS_INICIALES = [
  { id: 'area-sistemas', nombre: 'Sistemas' },
  { id: 'area-catastro', nombre: 'Catastro' },
  { id: 'area-administracion', nombre: 'Administración' },
]

export const USUARIOS_INICIALES = [
  { id: 'usuario-demo-1', username: 'usuario.demo1', email: 'demo1@gamc.gob.bo', rolId: 'rol-admin', areaId: 'area-sistemas' },
  { id: 'usuario-demo-2', username: 'usuario.demo2', email: 'demo2@gamc.gob.bo', rolId: 'rol-operador', areaId: 'area-catastro' },
  { id: 'usuario-demo-3', username: 'usuario.demo3', email: 'demo3@gamc.gob.bo', rolId: '', areaId: '' },
]

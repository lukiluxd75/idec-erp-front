import { NAV_SECTIONS } from '@/shared/nav'

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

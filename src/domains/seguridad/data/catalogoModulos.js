import { NAV_SECTIONS } from '@/shared/nav'

/**
 * Catálogo de módulos del ERP para armar permisos, derivado de NAV_SECTIONS (Inicio no
 * se incluye porque no es un módulo de negocio). Así el checklist de permisos de un rol
 * siempre coincide con lo que realmente existe en el ERP, en vez de una lista hardcodeada
 * aparte que se puede desincronizar.
 *
 * El catálogo real de acciones por módulo todavía no está definido (ver CLAUDE.md §10),
 * así que por ahora se usa un par genérico ver/editar como placeholder. El backend no
 * define este catálogo — lo recibe como códigos 'modulo.accion' al guardar los permisos
 * de un rol y crea la fila real de 'recurso'/'permiso' la primera vez que se usa cada
 * módulo (ver backend/.../infrastructure/sql_rbac_admin_repository.py).
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

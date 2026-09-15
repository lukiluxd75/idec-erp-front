import { NAV_SECTIONS } from '@/shared/nav'

/**
 * ERP module catalog used to build permissions, derived from NAV_SECTIONS (Home is
 * excluded because it is not a business module). Keeps a role's permission checklist
 * aligned with what actually exists in the ERP, instead of a separate hardcoded list
 * that can drift out of sync.
 *
 * The real per-module action catalog is not defined yet (see CLAUDE.md §10), so a generic
 * view/edit pair is used as a placeholder. The backend does not define this catalog — it
 * receives 'modulo.accion' codes when saving role permissions and creates the real
 * 'recurso'/'permiso' row the first time each module is used (see
 * backend/.../infrastructure/sql_rbac_admin_repository.py).
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

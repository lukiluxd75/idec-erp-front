import { NAV_SECTIONS } from '@/shared/nav'

/**
 * ERP module catalog used to build permissions, derived from NAV_SECTIONS (Home is
 * excluded because it is not a business module). Keeps a role's permission checklist
 * aligned with what actually exists in the ERP, instead of a separate hardcoded list
 * that can drift out of sync.
 *
 * Every module gets the generic view/edit pair; a module can add its own extra
 * actions via NAV_SECTIONS[i].actions (e.g. chatbot's `feedback`, so a role can be
 * granted "manage the procedure catalog" without also granting "see everyone's
 * feedback", or vice versa). The permission code is always `module.action`.
 *
 * The backend does NOT auto-create these — a module's `resources`/`permissions`
 * rows have to be seeded by the database team before a role can be granted them
 * here (CLAUDE.md §5/§10; see e.g. seed_permisos_chatbot.sql at the repo root).
 * This screen only ever offers what's in this catalog, never free text.
 */
export const BASE_ACTIONS = [
  { id: 'view', label: 'Ver' },
  { id: 'edit', label: 'Editar' },
]

export const ERP_MODULES = NAV_SECTIONS.filter((section) => section.path !== '/dashboard').map(
  (section) => ({
    id: section.path.replace('/', ''),
    label: section.label,
    actions: section.actions ? [...BASE_ACTIONS, ...section.actions] : BASE_ACTIONS,
  })
)

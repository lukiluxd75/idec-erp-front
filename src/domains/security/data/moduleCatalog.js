import { NAV_SECTIONS } from '@/shared/nav'

/**
 * ERP module catalog used to build role permissions. Derived from NAV_SECTIONS
 * (Home excluded — it is not a business module). Keeps the checklist aligned with
 * what exists in the menu instead of a hardcoded list that can drift.
 *
 * Phase-1 actions are the generic view/edit pair (guide §8). The backend receives
 * 'module.action' codes and creates resource/permission rows on first save.
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

/** Human-readable label for a permission code (e.g. detection.view → "Detección… · Ver"). */
export function permissionLabel(code) {
  if (!code || typeof code !== 'string') return code || ''
  const [moduleId, actionId, ...rest] = code.split('.')
  if (rest.length > 0 || !moduleId || !actionId) return code
  const module = ERP_MODULES.find((item) => item.id === moduleId)
  const action = ACTIONS.find((item) => item.id === actionId)
  const moduleLabel = module?.label || moduleId
  const actionLabel = action?.label || actionId
  return `${moduleLabel} · ${actionLabel}`
}

/** Short summary for role list cards: "3 módulos · 5 permisos". */
export function permissionSummary(codes = []) {
  const modules = new Set(
    codes.map((code) => (typeof code === 'string' ? code.split('.')[0] : null)).filter(Boolean)
  )
  const n = codes.length
  const m = modules.size
  if (n === 0) return 'Sin permisos'
  const modulesPart = m === 1 ? '1 módulo' : `${m} módulos`
  const permsPart = n === 1 ? '1 permiso' : `${n} permisos`
  return `${modulesPart} · ${permsPart}`
}

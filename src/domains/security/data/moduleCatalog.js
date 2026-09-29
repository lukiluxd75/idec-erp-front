import { NAV_SECTIONS } from '@/shared/nav'

/**
 * ERP module catalog used to build role permissions. Derived from NAV_SECTIONS
 * (Home excluded — it is not a business module). Keeps the checklist aligned with
 * what exists in the menu instead of a hardcoded list that can drift.
 *
 * Every module gets the generic view/edit pair; a module can add its own extra
 * actions via NAV_SECTIONS[i].actions (e.g. chatbot's `feedback`). The permission
 * code is always `module.action`.
 *
 * The backend does NOT auto-create these — a module's `resources`/`permissions`
 * rows have to be seeded before a role can be granted them here.
 * This screen only ever offers what's in this catalog, never free text.
 */
export const BASE_ACTIONS = [
  { id: 'view', label: 'Ver' },
  { id: 'edit', label: 'Editar' },
]

function collectPermissionNodes(sections) {
  const nodes = []
  const walk = (node, topLevel) => {
    if (node.permissionModule || (topLevel && node.path !== '/dashboard' && !node.group)) {
      nodes.push(node)
    }
    for (const child of node.children || []) walk(child, false)
  }
  for (const section of sections) walk(section, true)
  return nodes
}

export const ERP_MODULES = collectPermissionNodes(NAV_SECTIONS).map((section) => ({
  id: section.permissionModule || section.path.replace(/^\//, ''),
  label: section.catalogLabel || section.label,
  actions: section.actions ? [...BASE_ACTIONS, ...section.actions] : BASE_ACTIONS,
}))

/** Unique action columns for the permission matrix (view/edit + any extras). */
export const ACTIONS = (() => {
  const seen = new Map()
  for (const module of ERP_MODULES) {
    for (const action of module.actions) {
      if (!seen.has(action.id)) seen.set(action.id, action)
    }
  }
  return [...seen.values()]
})()

/** Human-readable label for a permission code (e.g. detection.view → "Detección… · Ver"). */
export function permissionLabel(code) {
  if (!code || typeof code !== 'string') return code || ''
  const [moduleId, actionId, ...rest] = code.split('.')
  if (rest.length > 0 || !moduleId || !actionId) return code
  const module = ERP_MODULES.find((item) => item.id === moduleId)
  const action =
    module?.actions?.find((item) => item.id === actionId) ||
    ACTIONS.find((item) => item.id === actionId)
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

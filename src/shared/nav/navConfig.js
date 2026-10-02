import {
  LayoutDashboard,
  Map,
  Camera,
  Layers,
  ShieldCheck,
  Users,
  KeyRound,
  Building2,
  ScanSearch,
  History,
  Bot,
  MessageCircle,
  ClipboardList,
  ScanLine,
  ScanText,
  ThumbsUp,
  ClipboardCheck,
  Sparkles,
  FileSpreadsheet,
  FolderSearch,
  FolderTree,
  FileText,
  Braces,
  Hash,
  FileOutput,
  MonitorCog,
  BarChart3,
} from 'lucide-react'

/**
 * ERP navigation tree — single source of truth for the home module grid
 * (app/pages/DashboardPage), the contextual sidebar (app/layout/Sidebar) and the
 * domain entry redirect (app/pages/DomainHome). Lives in shared/ so those consumers
 * do not depend on each other directly.
 */
// Orden alfabético por `label` (afecta la grilla de módulos del Dashboard y,
// de paso, el Sidebar -- este último ubica "Inicio" con `.find()`, no por
// posición, así que reordenar aquí no le afecta).
export const NAV_SECTIONS = [
  {
    label: 'Asistente de Trámites',
    icon: Bot,
    path: '/chatbot',
    actions: [{ id: 'feedback', label: 'Ver retroalimentación' }],
    children: [
      { label: 'Asistente', path: '/chatbot/chat', icon: MessageCircle },
      { label: 'Ingesta OCR', path: '/chatbot/ingest', icon: ScanLine, permission: 'chatbot.edit' },
      { label: 'Retroalimentación', path: '/chatbot/feedback', icon: ThumbsUp, permission: 'chatbot.feedback' },
      { label: 'Trámites', path: '/chatbot/procedures', icon: ClipboardList, permission: 'chatbot.edit' },
    ],
  },
  {
    label: 'Detección de construcciones',
    icon: Building2,
    path: '/detection',
    children: [
      { label: 'Mapa y detección', path: '/detection/map', icon: ScanSearch },
      { label: 'Historial', path: '/detection/history', icon: History },
    ],
  },
  {
    label: 'Herramientas OCR+IA',
    icon: Sparkles,
    path: '/ocr-ia',
    catalogGroup: true,
    children: [
      {
        label: 'Administrador de servidores de visión por computadora',
        path: '/digitization',
        icon: MonitorCog,
        permissionModule: 'digitization',
        accessPrefix: 'digitization',
      },
      {
        label: 'Analizador y extractor de datos de carpetas',
        path: '/folder-analysis',
        icon: FolderSearch,
        permissionModule: 'folder-analysis',
        accessPrefix: 'folder-analysis',
        children: [
          { label: 'Carpetas registradas', path: '/folder-analysis/folders', icon: FolderTree },
          { label: 'Datos guardados', path: '/folder-analysis/saved', icon: FileSpreadsheet },
        ],
      },
      {
        label: 'Detección de Folios',
        path: '/folios',
        icon: ScanText,
        permissionModule: 'folios',
        accessPrefix: 'folios',
      },
      {
        label: 'Geo-Extract',
        path: '/geoextraction/capture',
        icon: Map,
        permissionModule: 'geoextraction',
        accessPrefix: 'geoextraction',
        children: [
          { label: 'Captura OCR', path: '/geoextraction/capture', icon: Camera },
          { label: 'Fusión de Shapefiles', path: '/geoextraction/merge', icon: Layers },
        ],
      },
      {
        label: 'Lector OCR de Resoluciones P.H.',
        path: '/resolutions',
        icon: FileSpreadsheet,
        permissionModule: 'resolutions',
        accessPrefix: 'resolutions',
      },
    ],
  },
  {
    label: 'Inicio',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    label: 'Plantillas dinámicas',
    icon: FileText,
    path: '/templates',
    description: 'Gestione plantillas institucionales, variables, CITES y documentos.',
    children: [
      { label: 'CITES', path: '/templates/cites', icon: Hash, blurb: 'Códigos correlativos generados' },
      { label: 'Documentos', path: '/templates/documents', icon: FileOutput, blurb: 'Generación y descarga documental' },
      { label: 'Plantillas', path: '/templates/catalog', icon: FileText, blurb: 'Formatos institucionales reutilizables' },
      { label: 'Variables', path: '/templates/variables', icon: Braces, blurb: 'Datos dinámicos de los documentos' },
    ],
  },
  {
    label: 'Reportes',
    icon: BarChart3,
    path: '/procedurereports',
    permissionModule: 'procedurereports',
    description: 'Indicadores gerenciales del Área Técnica Cartografía (SLA, backlog y productividad).',
    children: [
      {
        label: 'Reporte gerencial',
        path: '/procedurereports/gerencial',
        icon: BarChart3,
        blurb: 'Salidas de bandeja, SLA y pendientes',
      },
    ],
  },
  {
    label: 'Revisión Avalúos',
    icon: ClipboardCheck,
    path: '/appraisal-review',
  },
  {
    label: 'Seguridad',
    icon: ShieldCheck,
    path: '/security',
    description:
      'Ordene el acceso así: primero defina áreas, luego cree roles con permisos y por último asígnelos a cada usuario.',
    children: [
      { label: 'Áreas', path: '/security/areas', icon: Building2, blurb: 'Unidades organizacionales' },
      { label: 'Roles', path: '/security/roles', icon: KeyRound, blurb: 'Definir qué puede hacer cada rol' },
      { label: 'Usuarios', path: '/security/users', icon: Users, blurb: 'Asignar roles, área y activar cuentas' },
    ],
  },
]

/** Domains with their own subsystems — each has an entry redirect (DomainHome). */
export const DOMAIN_SECTIONS = NAV_SECTIONS.filter((section) => section.children?.length)

function collectPaths(node) {
  const paths = node.path ? [node.path] : []
  for (const child of node.children || []) paths.push(...collectPaths(child))
  return paths
}

function collectAccessPrefixes(node) {
  const prefixes = []
  if (node.accessPrefix) prefixes.push(node.accessPrefix)
  else if (node.permission) prefixes.push(node.permission.split('.')[0])
  for (const child of node.children || []) prefixes.push(...collectAccessPrefixes(child))
  return prefixes
}

export function compareNavLabels(a, b) {
  return (a?.label || '').localeCompare(b?.label || '', 'es', { sensitivity: 'base' })
}

/**
 * Visible sidebar / domain children, A→Z at each nesting level (Spanish locale).
 */
export function getVisibleNavChildren(permissions, nodes) {
  return (nodes || [])
    .filter((child) => canViewChild(permissions, child))
    .map((child) => ({
      ...child,
      children: child.children?.length ? getVisibleNavChildren(permissions, child.children) : child.children,
    }))
    .sort(compareNavLabels)
}

/**
 * Entry path into a module from the catalog.
 * Opens the first function the user can open. DomainHome does not render a picker.
 */
export function getModuleEntryPath(section, permissions) {
  if (!section) return '/dashboard'
  const kids = getVisibleNavChildren(permissions, section.children)
  return kids[0]?.path || section.path
}

function flattenNavNodes(nodes, sectionLabel) {
  const routes = []
  for (const node of nodes) {
    routes.push({
      label: node.label,
      path: node.path,
      icon: node.icon,
      section: sectionLabel,
    })
    if (node.children?.length) routes.push(...flattenNavNodes(node.children, sectionLabel))
  }
  return routes
}

/**
 * Flattened routes that may still lack a real screen, used to generate <Route>s and
 * so ModulePlaceholder knows which title to show.
 */
export const PLACEHOLDER_ROUTES = NAV_SECTIONS.flatMap((section) => {
  if (section.path === '/dashboard') return []
  if (section.children) return flattenNavNodes(section.children, section.label)
  return [{ label: section.label, path: section.path, icon: section.icon, section: section.label }]
})

/**
 * Given a pathname, returns the NAV_SECTIONS domain it belongs to, or null if outside
 * any domain (e.g. /dashboard). Matches nested tool paths, including routes that keep
 * their original URL (for example /resolutions inside Herramientas OCR+IA).
 */
export function getCurrentDomain(pathname) {
  return (
    NAV_SECTIONS.find((section) => {
      if (section.path === '/dashboard') return false
      return collectPaths(section).some((path) => pathname === path || pathname.startsWith(`${path}/`))
    }) ?? null
  )
}

/**
 * True if `permissions` (codes 'module.action' from the authenticated user) enable the
 * module in `section`. A visual group is visible when the user can open at least one
 * of its permission-gated tools. Standalone modules use their path id.
 */
export function canViewModule(permissions, section) {
  if (!section) return false
  const codes = permissions || []
  if (section.catalogGroup) {
    const prefixes = collectAccessPrefixes(section)
    if (prefixes.length === 0) return true
    return prefixes.some((prefix) => codes.some((code) => code.startsWith(`${prefix}.`)))
  }
  const moduleId = section.permissionModule || section.path.replace(/^\//, '')
  return codes.some((code) => code.startsWith(`${moduleId}.`))
}

/**
 * True if `permissions` allow one specific child screen. Most children have no
 * `permission` (any user who can see the module can see them). `accessPrefix`
 * accepts any action of that module (resolutions.view or resolutions.edit).
 * A child that sets `permission` is hidden unless the user holds that exact code.
 */
export function canViewChild(permissions, child) {
  const codes = permissions || []
  if (child?.accessPrefix) return codes.some((code) => code.startsWith(`${child.accessPrefix}.`))
  if (!child?.permission) return true
  return codes.includes(child.permission)
}

/** Labels of a section and every nested tool, used by the dashboard search. */
export function collectNavLabels(node) {
  const labels = node?.label ? [node.label] : []
  for (const child of node?.children || []) labels.push(...collectNavLabels(child))
  return labels
}

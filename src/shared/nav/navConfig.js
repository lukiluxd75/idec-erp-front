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
  Gauge,
  GitBranch,
  Route,
} from 'lucide-react'

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
      { label: 'Reportes', path: '/detection/reports', icon: BarChart3 },
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
        overviewLabel: 'Extractor de datos',
        permissionModule: 'folder-analysis',
        accessPrefix: 'folder-analysis',
        actions: [{ id: 'admin', label: 'Administrar' }],
        children: [
          { label: 'Carpetas registradas', path: '/folder-analysis/folders', icon: FolderTree },
        ],
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
    description: 'Indicadores de trámites en bandeja del Área Técnica Cartografía (SLA y productividad).',
    children: [
      {
        label: 'Panel de indicadores',
        path: '/procedurereports/panel',
        icon: Gauge,
        navOrder: 1,
        blurb: 'Resumen del módulo y accesos rápidos',
      },
      {
        label: 'Reporte gerencial',
        path: '/procedurereports/gerencial',
        icon: BarChart3,
        navOrder: 2,
        blurb: 'Salidas de bandeja, SLA y pendientes',
      },
      {
        label: 'Derivación masiva',
        path: '/procedurereports/derivacion-masiva',
        icon: GitBranch,
        navOrder: 3,
        blurb: 'Recepción/despacho rápido y posibles adelantos',
      },
      {
        label: 'Traza del trámite',
        path: '/procedurereports/traza-tramite',
        icon: Route,
        navOrder: 4,
        blurb: 'Recorrido completo con tiempos por etapa',
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

/** Respeta `navOrder` cuando está definido; si no, orden alfabético en español. */
export function compareNavItems(a, b) {
  const ao = a?.navOrder
  const bo = b?.navOrder
  if (ao != null && bo != null) return ao - bo
  if (ao != null) return -1
  if (bo != null) return 1
  return compareNavLabels(a, b)
}

/** Visible sidebar / domain children, A→Z at each nesting level (Spanish locale). */
export function getVisibleNavChildren(permissions, nodes) {
  return (nodes || [])
    .filter((child) => canViewChild(permissions, child))
    .map((child) => ({
      ...child,
      children: child.children?.length ? getVisibleNavChildren(permissions, child.children) : child.children,
    }))
    .sort(compareNavItems)
}

/** Entry path into a module from the catalog. */
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

export const PLACEHOLDER_ROUTES = NAV_SECTIONS.flatMap((section) => {
  if (section.path === '/dashboard') return []
  if (section.children) return flattenNavNodes(section.children, section.label)
  return [{ label: section.label, path: section.path, icon: section.icon, section: section.label }]
})

/** Given a pathname, returns the NAV_SECTIONS domain it belongs to, or null if outside any domain (e.g. */
export function getCurrentDomain(pathname) {
  return (
    NAV_SECTIONS.find((section) => {
      if (section.path === '/dashboard') return false
      return collectPaths(section).some((path) => pathname === path || pathname.startsWith(`${path}/`))
    }) ?? null
  )
}

/** True if `permissions` (codes 'module.action' from the authenticated user) enable the module in `section`. */
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

/** True if `permissions` allow one specific child screen. */
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

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
  FileSpreadsheet,
  Bot,
  MessageCircle,
  ClipboardList,
  ScanLine,
  ThumbsUp,
  ClipboardCheck,
  FileText,
  Braces,
  Hash,
  FileOutput,
  FileSearch,
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
    // Acción extra sobre el par view/edit genérico (ver moduleCatalog.js) — separa
    // "gestionar el catálogo de trámites/ingesta" (chatbot.edit) de "ver la
    // retroalimentación de todos los usuarios" (chatbot.feedback), para que un rol
    // como "Asistente" pueda tener uno sin el otro.
    actions: [{ id: 'feedback', label: 'Ver retroalimentación' }],
    children: [
      { label: 'Asistente', path: '/chatbot/chat', icon: MessageCircle },
      // El resto son pantallas de administración (ver canViewChild) — el back
      // igual las rechaza con 403 sin el permiso, esto solo evita mostrar el
      // enlace a quien no puede usarlas.
      { label: 'Trámites', path: '/chatbot/procedures', icon: ClipboardList, permission: 'chatbot.edit' },
      { label: 'Ingesta OCR', path: '/chatbot/ingest', icon: ScanLine, permission: 'chatbot.edit' },
      { label: 'Retroalimentación', path: '/chatbot/feedback', icon: ThumbsUp, permission: 'chatbot.feedback' },
    ],
  },
  {
    label: 'Detección de construcciones',
    icon: Building2,
    path: '/detection',
    children: [
      { label: 'Mapa y detección', path: '/detection/map', icon: ScanSearch },
    ],
  },
  {
    label: 'Detección de Folios',
    icon: FileSearch,
    path: '/folios',
  },
  {
    label: 'Geo-Extract',
    icon: Map,
    path: '/geoextraction',
    children: [
      { label: 'Captura OCR', path: '/geoextraction/capture', icon: Camera },
      { label: 'Fusión de Shapefiles', path: '/geoextraction/merge', icon: Layers },
    ],
  },
  {
    label: 'Inicio',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    label: 'Lector OCR de Resoluciones P.H.',
    icon: FileSpreadsheet,
    path: '/resolutions',
  },
  {
    label: 'Plantillas dinámicas',
    icon: FileText,
    path: '/templates',
    description: 'Gestione plantillas institucionales, variables, CITES y documentos.',
    children: [
      { label: 'Plantillas', path: '/templates/catalog', icon: FileText, blurb: 'Formatos institucionales reutilizables' },
      { label: 'Variables', path: '/templates/variables', icon: Braces, blurb: 'Datos dinámicos de los documentos' },
      { label: 'CITES', path: '/templates/cites', icon: Hash, blurb: 'Códigos correlativos generados' },
      { label: 'Documentos', path: '/templates/documents', icon: FileOutput, blurb: 'Generación y descarga documental' },
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
      {
        label: 'Usuarios',
        path: '/security/users',
        icon: Users,
        blurb: 'Asignar roles, área y activar cuentas',
      },
      {
        label: 'Roles',
        path: '/security/roles',
        icon: KeyRound,
        blurb: 'Definir qué puede hacer cada rol',
      },
      {
        label: 'Áreas',
        path: '/security/areas',
        icon: Building2,
        blurb: 'Unidades organizacionales',
      },
    ],
  },
]

/** Domains with their own subsystems — each has an entry redirect (DomainHome). */
export const DOMAIN_SECTIONS = NAV_SECTIONS.filter((section) => section.children?.length)

/**
 * Entry path into a module from the catalog.
 * Opens the module's first function directly — DomainHome no longer shows a
 * function picker, so there is nothing to gain by landing on `section.path` first.
 */
export function getModuleEntryPath(section) {
  if (!section) return '/dashboard'
  const kids = section.children || []
  return kids[0]?.path || section.path
}

/**
 * Flattened leaf routes that still lack a real screen, used to generate <Route>s and
 * so ModulePlaceholder knows which title to show.
 */
export const PLACEHOLDER_ROUTES = NAV_SECTIONS.flatMap((section) => {
  if (section.children) {
    return section.children.map((item) => ({ ...item, section: section.label }))
  }
  if (section.path === '/dashboard') return []
  return [{ label: section.label, path: section.path, icon: section.icon, section: section.label }]
})

/**
 * Given a pathname, returns the NAV_SECTIONS domain it belongs to, or null if outside
 * any domain (e.g. /dashboard). Used by the sidebar.
 */
export function getCurrentDomain(pathname) {
  return (
    NAV_SECTIONS.find(
      (section) =>
        section.path !== '/dashboard' &&
        (pathname === section.path || pathname.startsWith(`${section.path}/`))
    ) ?? null
  )
}

/**
 * True if `permissions` (codes 'module.action' from the authenticated user) enable the
 * module in `section`. Module id is `section.path` without the leading slash — same
 * criterion as the role permission checklist (domains/security/data/moduleCatalog.js).
 */
export function canViewModule(permissions, section) {
  if (!section) return false
  const moduleId = section.path.replace('/', '')
  return (permissions || []).some((code) => code.startsWith(`${moduleId}.`))
}

/**
 * True if `permissions` allow one specific child screen. Most children have no
 * `permission` (any user who can see the module can see them — same as before
 * this field existed); a child that sets one (e.g. an admin screen) is hidden
 * unless the user holds that exact code. This only controls the link's
 * visibility — the backend enforces the real check independently.
 */
export function canViewChild(permissions, child) {
  if (!child?.permission) return true
  return (permissions || []).includes(child.permission)
}

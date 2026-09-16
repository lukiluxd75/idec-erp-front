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
} from 'lucide-react'

/**
 * ERP navigation tree — single source of truth for the home module grid
 * (app/pages/DashboardPage), the contextual sidebar (app/layout/Sidebar) and domain
 * entry screens (app/pages/DomainHome). Lives in shared/ so those consumers do not
 * depend on each other directly.
 */
export const NAV_SECTIONS = [
  {
    label: 'Inicio',
    icon: LayoutDashboard,
    path: '/dashboard',
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
    label: 'Detección de construcciones',
    icon: Building2,
    path: '/detection',
    children: [
      { label: 'Mapa y detección', path: '/detection/map', icon: ScanSearch },
    ],
  },
  {
    label: 'Lector OCR de Resoluciones P.H.',
    icon: FileSpreadsheet,
    path: '/resolutions',
  },
  {
    label: 'Seguridad',
    icon: ShieldCheck,
    path: '/security',
    children: [
      { label: 'Usuarios', path: '/security/users', icon: Users },
      { label: 'Roles', path: '/security/roles', icon: KeyRound },
    ],
  },
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
]

/** Domains with their own subsystems — each has an entry page (DomainHome). */
export const DOMAIN_SECTIONS = NAV_SECTIONS.filter((section) => section.children?.length)

/**
 * Entry path into a module from the catalog.
 * If there is only one feature, open that screen directly (avoids redundant DomainHome).
 */
export function getModuleEntryPath(section) {
  if (!section) return '/dashboard'
  const kids = section.children || []
  if (kids.length === 1 && kids[0]?.path) return kids[0].path
  return section.path
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

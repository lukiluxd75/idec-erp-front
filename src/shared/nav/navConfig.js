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

import { LayoutDashboard, Map, Camera, Layers, ShieldCheck, Users, KeyRound } from 'lucide-react'

/**
 * Árbol de navegación del ERP — fuente única de verdad para la grilla de módulos del home
 * (app/pages/DashboardPage), el sidebar contextual (app/layout/Sidebar) y las pantallas de
 * entrada a cada dominio (app/pages/DomainHome). Vive en shared/ porque estos consumidores no
 * deben depender unos de otros directamente.
 *
 * Patrón de navegación: el home muestra todos los dominios como botones grandes; al entrar a
 * uno (su `path`), el sidebar aparece mostrando solo los subapartados de ESE dominio (más un
 * link para volver a Inicio) — antes de entrar a un dominio el sidebar no se muestra. Por ahora
 * el único dominio con pantallas reales es Geo-Extract; los demás dominios del ERP (Catastro,
 * Administración, ...) se suman acá cuando existan (ver docs/COMO_AGREGAR_UN_DOMINIO.md).
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
    path: '/geoextraccion',
    children: [
      { label: 'Captura OCR', path: '/geoextraccion/captura', icon: Camera },
      { label: 'Fusión de Shapefiles', path: '/geoextraccion/fusion', icon: Layers },
    ],
  },
  {
    label: 'Seguridad',
    icon: ShieldCheck,
    path: '/seguridad',
    children: [
      { label: 'Usuarios', path: '/seguridad/usuarios', icon: Users },
      { label: 'Roles', path: '/seguridad/roles', icon: KeyRound },
    ],
  },
]

/** Dominios con subsistemas propios — cada uno tiene su página de entrada (DomainHome). */
export const DOMAIN_SECTIONS = NAV_SECTIONS.filter((section) => section.children?.length)

/**
 * Versión aplanada de todas las rutas hoja que todavía no tienen pantalla real,
 * usada para generar sus <Route> y para que ModulePlaceholder sepa qué título mostrar.
 */
export const PLACEHOLDER_ROUTES = NAV_SECTIONS.flatMap((section) => {
  if (section.children) {
    return section.children.map((item) => ({ ...item, section: section.label }))
  }
  if (section.path === '/dashboard') return []
  return [{ label: section.label, path: section.path, icon: section.icon, section: section.label }]
})

/**
 * Dado un pathname, devuelve el dominio de NAV_SECTIONS al que pertenece (su `path` o
 * cualquiera de sus `children`), o null si el pathname no está dentro de ningún dominio
 * (ej. /dashboard). Usado por el sidebar para saber si debe mostrarse y con qué contenido.
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
 * True si `permisos` (códigos 'modulo.accion' del usuario autenticado, ver
 * AuthProvider — vienen de seguridad.usuario_rol_area -> rol_permiso -> permiso) habilita
 * el módulo de `section`. El id de módulo es `section.path` sin la barra inicial — el
 * mismo criterio que ya usa el checklist de permisos de un rol
 * (domains/seguridad/data/catalogoModulos.js) para no desincronizarse con él. Un usuario
 * sin ningún rol asignado tiene `permisos: []` y por lo tanto no puede ver ningún módulo.
 */
export function puedeVerModulo(permisos, section) {
  if (!section) return false
  const moduloId = section.path.replace('/', '')
  return (permisos || []).some((codigo) => codigo.startsWith(`${moduloId}.`))
}

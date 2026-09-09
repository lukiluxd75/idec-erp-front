/**
 * Único lugar que conoce todos los dominios del ERP con pantallas reales — equivalente
 * frontend de backend/app/registry.py. Para agregar un dominio nuevo: crear su carpeta acá
 * al lado (con su propio routes.jsx) y sumar su import a DOMAIN_ROUTES — no hace falta tocar
 * ningún otro dominio existente ni el router raíz más allá de esta línea.
 */
import { geoextraccionRoutes } from './geoextraccion/routes'
import { seguridadRoutes } from './seguridad/routes'
import { deteccionRoutes } from './deteccion/routes'

export const DOMAIN_ROUTES = [...geoextraccionRoutes, ...seguridadRoutes, ...deteccionRoutes]

/** true si la ruta activa pidió el contenedor ancho de AppShell en vez del max-w-4xl por defecto. */
export function isWideRoute(pathname) {
  return DOMAIN_ROUTES.some((route) => route.path === pathname && route.wide)
}

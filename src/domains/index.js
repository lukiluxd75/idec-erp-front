/**
 * Single place that knows every ERP domain with real screens — frontend equivalent of
 * backend/app/registry.py. To add a domain: create its folder here (with its own
 * routes.jsx) and add its import to DOMAIN_ROUTES.
 */
import { geoextractionRoutes } from './geoextraction/routes'
import { securityRoutes } from './security/routes'
import { detectionRoutes } from './detection/routes'
import { resolutionsRoutes } from './resolutions/routes'

export const DOMAIN_ROUTES = [
  ...geoextractionRoutes,
  ...securityRoutes,
  ...detectionRoutes,
  ...resolutionsRoutes,
]

/** true if the active route requested AppShell's wide container instead of max-w-4xl. */
export function isWideRoute(pathname) {
  return DOMAIN_ROUTES.some((route) => route.path === pathname && route.wide)
}

/**
 * Single place that knows every ERP domain with real screens — frontend equivalent of
 * backend/app/registry.py. To add a domain: create its folder here (with its own
 * routes.jsx) and add its import to DOMAIN_ROUTES.
 */
import { matchPath } from 'react-router-dom'

import { geoextractionRoutes } from './geoextraction/routes'
import { securityRoutes } from './security/routes'
import { detectionRoutes } from './detection/routes'
import { resolutionsRoutes } from './resolutions/routes'
import { facturasRoutes } from './facturas/routes'
import { chatbotRoutes } from './chatbot/routes'
import { appraisalReviewRoutes } from './appraisal-review/routes'
import { templatesRoutes } from './templates/routes'
import { digitizationRoutes } from './digitization/routes'
import { folderAnalysisRoutes } from './folder-analysis/routes'

export const DOMAIN_ROUTES = [
  ...geoextractionRoutes,
  ...securityRoutes,
  ...detectionRoutes,
  ...resolutionsRoutes,
  ...facturasRoutes,
  ...chatbotRoutes,
  ...appraisalReviewRoutes,
  ...templatesRoutes,
  ...digitizationRoutes,
  ...folderAnalysisRoutes,
]

/** true if the active route requested AppShell's wide container instead of max-w-4xl. */
export function isWideRoute(pathname) {
  // matchPath, not ===: wide routes are usually detail pages with params (/resolutions/:id).
  return DOMAIN_ROUTES.some((route) => route.wide && matchPath(route.path, pathname))
}

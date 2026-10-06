/** Single place that knows every ERP domain with real screens — frontend equivalent of backend/app/registry.py. */
import { matchPath } from 'react-router-dom'

import { geoextractionRoutes } from './geoextraction/routes'
import { securityRoutes } from './security/routes'
import { detectionRoutes } from './detection/routes'
import { resolutionsRoutes } from './resolutions/routes'
import { chatbotRoutes } from './chatbot/routes'
import { appraisalReviewRoutes } from './appraisal-review/routes'
import { templatesRoutes } from './templates/routes'
import { digitizationRoutes } from './digitization/routes'
import { folderAnalysisRoutes } from './folder-analysis/routes'
import { alignmentRoutes } from './alignment/routes'
import { foliosRoutes } from './folios/routes'
import { procedureReportsRoutes } from './procedurereports/routes'

export const DOMAIN_ROUTES = [
  ...geoextractionRoutes,
  ...securityRoutes,
  ...detectionRoutes,
  ...resolutionsRoutes,
  ...chatbotRoutes,
  ...appraisalReviewRoutes,
  ...templatesRoutes,
  ...digitizationRoutes,
  ...folderAnalysisRoutes,
  ...alignmentRoutes,
  ...foliosRoutes,
  ...procedureReportsRoutes,
]

/** true if the active route requested AppShell's wide container instead of max-w-4xl. */
export function isWideRoute(pathname) {
  // matchPath, not ===: wide routes are usually detail pages with params (/resolutions/:id).
  return DOMAIN_ROUTES.some((route) => route.wide && matchPath(route.path, pathname))
}

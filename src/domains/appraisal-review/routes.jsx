/* eslint-disable react-refresh/only-export-components -- este archivo
   exporta metadatos de rutas, no componentes: las paginas lazy de abajo no
   son fronteras de Fast Refresh. Misma excusa que en
   domains/cadastralviewer/routes.jsx. */
import { lazy } from 'react'

const PendingAppraisalsPage = lazy(() => import('./pages/PendingAppraisalsPage'))
const AppraisalReviewPage = lazy(() => import('./pages/AppraisalReviewPage'))

/**
 * Real routes for the appraisal_review domain. Registered in `src/domains/index.js`
 * (the single place that knows every domain — frontend counterpart of
 * backend/app/registry.py). `wide: true` on the review screen: the read-only sections
 * needs more horizontal room than the default max-w-4xl.
 */
export const appraisalReviewRoutes = [
  { path: '/appraisal-review', element: <PendingAppraisalsPage /> },
  { path: '/appraisal-review/:formNumber', element: <AppraisalReviewPage />, wide: true },
]

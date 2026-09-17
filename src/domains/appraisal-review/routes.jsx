import PendingAppraisalsPage from './pages/PendingAppraisalsPage'
import AppraisalReviewPage from './pages/AppraisalReviewPage'

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

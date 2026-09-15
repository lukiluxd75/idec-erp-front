import ResolutionsListPage from './pages/ResolutionsListPage'
import ResolutionPage from './pages/ResolutionPage'

/**
 * Real routes for the resolutions domain. Registered in src/domains/index.js.
 */
export const resolutionsRoutes = [
  { path: '/resolutions', element: <ResolutionsListPage /> },
  { path: '/resolutions/:id', element: <ResolutionPage />, wide: true },
]

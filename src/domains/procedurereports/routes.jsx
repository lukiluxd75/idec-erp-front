import ReportsPage from './pages/ReportsPage'

/**
 * Real routes for the procedurereports domain (reporte gerencial de
 * trámites -- see backend/app/domains/procedurereports). Registered in
 * `src/domains/index.js`, the single place that knows every domain.
 */
export const procedureReportsRoutes = [{ path: '/procedurereports', element: <ReportsPage /> }]

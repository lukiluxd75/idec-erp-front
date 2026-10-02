/* eslint-disable react-refresh/only-export-components -- este archivo
   exporta metadatos de rutas, no componentes: las paginas lazy de abajo no
   son fronteras de Fast Refresh. Misma excusa que en
   domains/cadastralviewer/routes.jsx. */
import { lazy } from 'react'

const ReportsPage = lazy(() => import('./pages/ReportsPage'))

/**
 * Real routes for the procedurereports domain (reporte gerencial de
 * trámites -- see backend/app/domains/procedurereports). Registered in
 * `src/domains/index.js`, the single place that knows every domain.
 */
export const procedureReportsRoutes = [
  { path: '/procedurereports/gerencial', element: <ReportsPage />, wide: true },
]

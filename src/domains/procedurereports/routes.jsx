/* eslint-disable react-refresh/only-export-components -- este archivo
   exporta metadatos de rutas, no componentes: las paginas lazy de abajo no
   son fronteras de Fast Refresh. Misma excusa que en
   domains/cadastralviewer/routes.jsx. */
import { lazy } from 'react'

const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const PanelPage = lazy(() => import('./pages/PanelPage'))
const MassForwardingPage = lazy(() => import('./pages/MassForwardingPage'))
const ProcedureTracePage = lazy(() => import('./pages/ProcedureTracePage'))

/**
 * Real routes for the procedurereports domain (reporte gerencial de
 * trámites -- see backend/app/domains/procedurereports). Registered in
 * `src/domains/index.js`, the single place that knows every domain.
 */
export const procedureReportsRoutes = [
  { path: '/procedurereports/panel', element: <PanelPage />, wide: true },
  { path: '/procedurereports/gerencial', element: <ReportsPage />, wide: true },
  { path: '/procedurereports/derivacion-masiva', element: <MassForwardingPage />, wide: true },
  { path: '/procedurereports/traza-tramite', element: <ProcedureTracePage />, wide: true },
]

/* eslint-disable react-refresh/only-export-components -- este archivo
   exporta metadatos de rutas, no componentes: las paginas lazy de abajo no
   son fronteras de Fast Refresh. Misma excusa que en
   domains/cadastralviewer/routes.jsx. */
import { lazy } from 'react'

const WorkersPage = lazy(() => import('./pages/WorkersPage'))

/** Routes for the digitization domain ("Digitalización IA"). */
export const digitizationRoutes = [{ path: '/digitization', element: <WorkersPage /> }]

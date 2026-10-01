/* eslint-disable react-refresh/only-export-components -- este archivo
   exporta metadatos de rutas, no componentes: las paginas lazy de abajo no
   son fronteras de Fast Refresh. Misma excusa que en
   domains/cadastralviewer/routes.jsx. */
import { lazy } from 'react'

const FoliosListPage = lazy(() => import('./pages/FoliosListPage'))
const FolioDetailPage = lazy(() => import('./pages/FolioDetailPage'))

/**
 * Routes for the folios domain ("Detección de Folios"). Registered in
 * src/domains/index.js.
 */
export const foliosRoutes = [
  { path: '/folios', element: <FoliosListPage /> },
  { path: '/folios/:id', element: <FolioDetailPage />, wide: true },
]

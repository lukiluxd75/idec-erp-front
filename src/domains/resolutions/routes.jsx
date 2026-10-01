/* eslint-disable react-refresh/only-export-components -- este archivo
   exporta metadatos de rutas, no componentes: las paginas lazy de abajo no
   son fronteras de Fast Refresh. Misma excusa que en
   domains/cadastralviewer/routes.jsx. */
import { lazy } from 'react'

const ResolutionsListPage = lazy(() => import('./pages/ResolutionsListPage'))
const NewResolutionPage = lazy(() => import('./pages/NewResolutionPage'))
const ResolutionPage = lazy(() => import('./pages/ResolutionPage'))

/**
 * Real routes for the resolutions domain. Registered in src/domains/index.js.
 */
export const resolutionsRoutes = [
  { path: '/resolutions', element: <ResolutionsListPage /> },
  { path: '/resolutions/new', element: <NewResolutionPage />, wide: true },
  { path: '/resolutions/:id', element: <ResolutionPage />, wide: true },
]

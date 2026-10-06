/* eslint-disable react-refresh/only-export-components -- este archivo
   exporta metadatos de rutas, no componentes: las paginas lazy de abajo no
   son fronteras de Fast Refresh. Misma excusa que en
   domains/cadastralviewer/routes.jsx. */
import { lazy } from 'react'

const CapturePage = lazy(() => import('./pages/CapturePage'))
const MergePage = lazy(() => import('./pages/MergePage'))

/** Real routes for the geoextraction domain. */
export const geoextractionRoutes = [
  { path: '/geoextraction/capture', element: <CapturePage />, wide: true },
  { path: '/geoextraction/merge', element: <MergePage /> },
]

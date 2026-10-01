/* eslint-disable react-refresh/only-export-components -- este archivo
   exporta metadatos de rutas, no componentes: las paginas lazy de abajo no
   son fronteras de Fast Refresh. Misma excusa que en
   domains/cadastralviewer/routes.jsx. */
import { lazy } from 'react'
import { DetectionErrorBoundary } from './components/DetectionErrorBoundary'

const DetectionPage = lazy(() => import('./pages/DetectionPage'))
const HistorialPage = lazy(() => import('./pages/HistorialPage'))

export const detectionRoutes = [
  {
    path: '/detection/map',
    element: (
      <DetectionErrorBoundary>
        <DetectionPage />
      </DetectionErrorBoundary>
    ),
    wide: true,
  },
  {
    path: '/detection/history',
    element: (
      <DetectionErrorBoundary>
        <HistorialPage />
      </DetectionErrorBoundary>
    ),
    wide: true,
  },
]

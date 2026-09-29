import DetectionPage from './pages/DetectionPage'
import HistorialPage from './pages/HistorialPage'
import { DetectionErrorBoundary } from './components/DetectionErrorBoundary'

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

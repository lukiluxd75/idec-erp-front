import DetectionPage from './pages/DetectionPage'
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
]

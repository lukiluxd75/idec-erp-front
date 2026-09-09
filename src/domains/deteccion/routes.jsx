import DeteccionPage from './pages/DeteccionPage'
import { DeteccionErrorBoundary } from './components/DeteccionErrorBoundary'

export const deteccionRoutes = [
  {
    path: '/deteccion/mapa',
    element: (
      <DeteccionErrorBoundary>
        <DeteccionPage />
      </DeteccionErrorBoundary>
    ),
    wide: true,
  },
]

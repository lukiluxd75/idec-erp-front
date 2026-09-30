import AlignmentPage from './pages/AlignmentPage'
import { AlignmentErrorBoundary } from './components/AlignmentErrorBoundary'

export const alignmentRoutes = [
  {
    path: '/alignment/map',
    element: (
      <AlignmentErrorBoundary>
        <AlignmentPage />
      </AlignmentErrorBoundary>
    ),
    wide: true,
  },
]

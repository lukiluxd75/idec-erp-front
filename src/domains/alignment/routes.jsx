/* eslint-disable react-refresh/only-export-components -- este archivo
   exporta metadatos de rutas, no componentes: las paginas lazy de abajo no
   son fronteras de Fast Refresh. Misma excusa que en
   domains/cadastralviewer/routes.jsx. */
import { lazy } from 'react'
import { AlignmentErrorBoundary } from './components/AlignmentErrorBoundary'

const AlignmentPage = lazy(() => import('./pages/AlignmentPage'))

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

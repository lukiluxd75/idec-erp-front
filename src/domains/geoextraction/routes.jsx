import CapturePage from './pages/CapturePage'
import MergePage from './pages/MergePage'

/**
 * Real routes for the geoextraction domain. Registered in src/domains/index.js.
 * `wide: true` asks AppShell for the wide container instead of max-w-4xl.
 */
export const geoextractionRoutes = [
  { path: '/geoextraction/capture', element: <CapturePage />, wide: true },
  { path: '/geoextraction/merge', element: <MergePage /> },
]

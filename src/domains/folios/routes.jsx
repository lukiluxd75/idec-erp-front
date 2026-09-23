import FoliosListPage from './pages/FoliosListPage'
import FolioDetailPage from './pages/FolioDetailPage'

/**
 * Routes for the folios domain ("Detección de Folios"). Registered in
 * src/domains/index.js.
 */
export const foliosRoutes = [
  { path: '/folios', element: <FoliosListPage /> },
  { path: '/folios/:id', element: <FolioDetailPage />, wide: true },
]

import FacturasListPage from './pages/FacturasListPage'
import FacturaDetailPage from './pages/FacturaDetailPage'

/**
 * Routes for the facturas domain ("Facturas"). Registered in
 * src/domains/index.js.
 */
export const facturasRoutes = [
  { path: '/facturas', element: <FacturasListPage /> },
  { path: '/facturas/:id', element: <FacturaDetailPage />, wide: true },
]

import CapturaPage from './pages/CapturaPage'
import FusionPage from './pages/FusionPage'

/**
 * Rutas reales del dominio geoextraccion. Se registran en app/routes.jsx (único lugar que
 * conoce todos los dominios — equivalente frontend de backend/app/registry.py).
 * `wide: true` le pide a AppShell el contenedor ancho en vez del max-w-4xl por defecto.
 */
export const geoextraccionRoutes = [
  { path: '/geoextraccion/captura', element: <CapturaPage />, wide: true },
  { path: '/geoextraccion/fusion', element: <FusionPage /> },
]

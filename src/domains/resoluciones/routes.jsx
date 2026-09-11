import ListaResolucionesPage from './pages/ListaResolucionesPage'
import ResolucionPage from './pages/ResolucionPage'

/**
 * Rutas reales del dominio resoluciones. Se registran en `src/domains/index.js` (único
 * lugar que conoce todos los dominios — equivalente frontend de backend/app/registry.py).
 * `wide: true` le pide a AppShell el contenedor ancho en vez del max-w-4xl por defecto
 * (la tabla de superficies necesita el espacio horizontal).
 */
export const resolucionesRoutes = [
  { path: '/resoluciones', element: <ListaResolucionesPage /> },
  { path: '/resoluciones/:id', element: <ResolucionPage />, wide: true },
]

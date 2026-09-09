import UsuariosPage from './pages/UsuariosPage'
import RolesPage from './pages/RolesPage'

/**
 * Rutas reales del dominio seguridad (módulo "Roles" en el sidebar). Se registran en
 * app/routes.jsx (único lugar que conoce todos los dominios — equivalente frontend de
 * backend/app/registry.py).
 */
export const seguridadRoutes = [
  { path: '/seguridad/usuarios', element: <UsuariosPage /> },
  { path: '/seguridad/roles', element: <RolesPage /> },
]

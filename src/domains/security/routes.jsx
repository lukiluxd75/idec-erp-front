import UsersPage from './pages/UsersPage'
import RolesPage from './pages/RolesPage'

/**
 * Real routes for the security domain. Registered in src/domains/index.js.
 */
export const securityRoutes = [
  { path: '/security/users', element: <UsersPage /> },
  { path: '/security/roles', element: <RolesPage /> },
]

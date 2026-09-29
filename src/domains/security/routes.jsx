import UsersPage from './pages/UsersPage'
import RolesPage from './pages/RolesPage'
import AreasPage from './pages/AreasPage'

/**
 * Security domain routes. Registered in src/domains/index.js.
 * Domain home /security is provided by app DomainHome via NAV_SECTIONS.
 */
export const securityRoutes = [
  { path: '/security/users', element: <UsersPage /> },
  { path: '/security/roles', element: <RolesPage /> },
  { path: '/security/areas', element: <AreasPage /> },
]

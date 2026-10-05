/* eslint-disable react-refresh/only-export-components -- este archivo
   exporta metadatos de rutas, no componentes: las paginas lazy de abajo no
   son fronteras de Fast Refresh. Misma excusa que en
   domains/cadastralviewer/routes.jsx. */
import { lazy } from 'react'

const UsersPage = lazy(() => import('./pages/UsersPage'))
const RolesPage = lazy(() => import('./pages/RolesPage'))
const AreasPage = lazy(() => import('./pages/AreasPage'))

/** Security domain routes. */
export const securityRoutes = [
  { path: '/security/users', element: <UsersPage /> },
  { path: '/security/roles', element: <RolesPage /> },
  { path: '/security/areas', element: <AreasPage /> },
]

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/auth/pages'
import { ProtectedRoute, PublicRoute } from '@/auth/guards'
import { useAuth } from '@/auth/hooks/useAuth'
import { PLACEHOLDER_ROUTES, DOMAIN_SECTIONS, getCurrentDomain, canViewModule } from '@/shared/nav'
import { DOMAIN_ROUTES } from '@/domains'
import { AppShell } from './layout'
import { DashboardPage, DomainHome, ModulePlaceholder } from './pages'

// Paths with a real screen (see src/domains/index.js) — excluded from the generic placeholder.
const IMPLEMENTED_PATHS = new Set(DOMAIN_ROUTES.map((route) => route.path))

/**
 * Blocks direct URL entry into a module that `permisos` does not allow (hiding the
 * sidebar/dashboard link is not enough — without this someone could type the path
 * by hand). `section` is the NAV_SECTIONS entry that owns the route (see getCurrentDomain).
 */
function ModuleGuard({ section, children }) {
  const { user } = useAuth()
  if (!canViewModule(user?.permisos, section)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

/**
 * Main app router with public vs protected route separation.
 * Every protected route mounts inside <AppShell/> (sidebar + header), which exposes
 * the rest of the tree via <Outlet/>.
 */
export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login route (if already authenticated, redirects to /dashboard) */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Protected area: requires a valid Keycloak token; navigated from the sidebar */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Domain entry: shows its subsystems as large buttons */}
          {DOMAIN_SECTIONS.map((domain) => (
            <Route
              key={domain.path}
              path={domain.path.slice(1)}
              element={
                <ModuleGuard section={domain}>
                  <DomainHome />
                </ModuleGuard>
              }
            />
          ))}

          {/* Domains with a real screen (see src/domains/index.js) */}
          {DOMAIN_ROUTES.map((route) => (
            <Route
              key={route.path}
              path={route.path.slice(1)}
              element={<ModuleGuard section={getCurrentDomain(route.path)}>{route.element}</ModuleGuard>}
            />
          ))}

          {/* ERP modules without real functionality yet (see shared/nav/navConfig.js) */}
          {PLACEHOLDER_ROUTES.filter((route) => !IMPLEMENTED_PATHS.has(route.path)).map((route) => (
            <Route
              key={route.path}
              path={route.path.slice(1)}
              element={
                <ModuleGuard section={getCurrentDomain(route.path)}>
                  <ModulePlaceholder />
                </ModuleGuard>
              }
            />
          ))}
        </Route>

        {/* Redirect for any unrecognized route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/auth/pages'
import { ProtectedRoute, PublicRoute } from '@/auth/guards'
import { useAuth } from '@/auth/hooks/useAuth'
import { PLACEHOLDER_ROUTES, DOMAIN_SECTIONS, getCurrentDomain, puedeVerModulo } from '@/shared/nav'
import { DOMAIN_ROUTES } from '@/domains'
import { AppShell } from './layout'
import { DashboardPage, DomainHome, ModulePlaceholder } from './pages'

// Paths con pantalla real (ver src/domains/index.js) — se excluyen del placeholder genérico.
const IMPLEMENTED_PATHS = new Set(DOMAIN_ROUTES.map((route) => route.path))

/**
 * Bloquea la entrada por URL directa a un módulo que `permisos` no habilita (ocultar el
 * link en el sidebar/dashboard no alcanza — sin esto alguien podía escribir la ruta a
 * mano). `section` es la entrada de NAV_SECTIONS dueña de la ruta (ver getCurrentDomain).
 */
function ModuleGuard({ section, children }) {
  const { user } = useAuth()
  if (!puedeVerModulo(user?.permisos, section)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

/**
 * Enrutador principal de la aplicación con separación de rutas públicas y protegidas.
 * Toda ruta protegida se monta dentro de <AppShell/> (sidebar + header), que expone
 * el resto del árbol vía <Outlet/>.
 */
export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública de Login (si ya está autenticado, redirige a /dashboard) */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Área protegida: requiere token válido de Keycloak, se navega desde el sidebar */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Entrada a cada dominio: muestra sus subsistemas como botones grandes */}
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

          {/* Dominios con pantalla real (ver src/domains/index.js) */}
          {DOMAIN_ROUTES.map((route) => (
            <Route
              key={route.path}
              path={route.path.slice(1)}
              element={<ModuleGuard section={getCurrentDomain(route.path)}>{route.element}</ModuleGuard>}
            />
          ))}

          {/* Módulos del ERP sin funcionalidad real todavía (ver shared/nav/navConfig.js) */}
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

        {/* Redirección para cualquier otra ruta no reconocida */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes

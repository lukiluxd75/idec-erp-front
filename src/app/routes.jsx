import { Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/auth/pages'
import { ProtectedRoute, PublicRoute } from '@/auth/guards'
import { useAuth } from '@/auth/hooks/useAuth'
import { PLACEHOLDER_ROUTES, DOMAIN_SECTIONS, getCurrentDomain, canViewModule } from '@/shared/nav'
import { DOMAIN_ROUTES } from '@/domains'
import { Spinner } from '@/shared/ui/Spinner'
import { AppShell } from './layout'
import { DashboardPage, DomainHome, ModulePlaceholder } from './pages'

// ▼ Import defensivo: si el archivo no existe o falla, no rompe la app
import * as cadastralViewerModule from '@/domains/cadastralviewer/routes'

// Normaliza: acepta tanto `export const cadastralViewerRoutes` como `export default`
const cadastralViewerRoutes =
  cadastralViewerModule?.cadastralViewerRoutes ||
  (Array.isArray(cadastralViewerModule?.default) ? cadastralViewerModule.default : [])

// Debug temporal — borrar cuando funcione
console.log('[AppRoutes] cadastralViewerRoutes =', cadastralViewerRoutes)

const IMPLEMENTED_PATHS = new Set(DOMAIN_ROUTES.map((route) => route.path))

function RouteFallback() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Spinner className="h-8 w-8 text-accent-400" />
    </div>
  )
}

function ModuleGuard({ section, children }) {
  const { user } = useAuth()
  if (!canViewModule(user?.permisos, section)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Prueba temporal */}
        <Route
          path="/kiosk-test"
          element={
            <div style={{ padding: 40, fontSize: 24, fontFamily: 'sans-serif' }}>
              ✅ /kiosk-test funciona
            </div>
          }
        />

        <Route element={<ProtectedRoute />}>
          {Array.isArray(cadastralViewerRoutes) && cadastralViewerRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                <Suspense fallback={<div style={{ height: '100dvh' }} />}>
                  {route.element}
                </Suspense>
              }
            />
          ))}
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />

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

          {DOMAIN_ROUTES.map((route) => (
            <Route
              key={route.path}
              path={route.path.slice(1)}
              element={
                <ModuleGuard section={getCurrentDomain(route.path)}>
                  <Suspense fallback={<RouteFallback />}>{route.element}</Suspense>
                </ModuleGuard>
              }
            />
          ))}

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
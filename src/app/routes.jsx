import { Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { LoginPage } from '@/auth/pages'
import { ProtectedRoute, PublicRoute } from '@/auth/guards'
import { useAuth } from '@/auth/hooks/useAuth'
import { PLACEHOLDER_ROUTES, DOMAIN_SECTIONS, NAV_SECTIONS, getCurrentDomain, canViewModule } from '@/shared/nav'
import { DOMAIN_ROUTES } from '@/domains'
import { cadastralViewerRoutes } from '@/domains/cadastralviewer/routes'
import { Spinner } from '@/shared/ui/Spinner'
import { AppShell } from './layout'
import { DashboardPage, DomainHome, ModulePlaceholder, NotFoundPage } from './pages'

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

function RouteDocumentTitle() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname === '/') {
      document.title = 'Iniciar sesión · IDEC · GAMC'
      return
    }
    if (pathname === '/kiosk') {
      document.title = 'Kiosco · Visor Catastral · IDEC · GAMC'
      return
    }

    const matches = []
    const collect = (nodes) => {
      for (const node of nodes) {
        if (node.path && (pathname === node.path || pathname.startsWith(`${node.path}/`))) {
          matches.push(node)
        }
        if (node.children) collect(node.children)
      }
    }
    collect(NAV_SECTIONS)
    const title = matches.sort((a, b) => b.path.length - a.path.length)[0]?.label
    document.title = title ? `${title} · IDEC · GAMC` : 'Página no encontrada · IDEC · GAMC'
  }, [pathname])

  return null
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <RouteDocumentTitle />
      <Routes>

        <Route
          path="/"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {cadastralViewerRoutes.filter((route) => route.path === '/kiosk').map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<Suspense fallback={<div style={{ height: '100dvh' }} />}>{route.element}</Suspense>}
          />
        ))}

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

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes

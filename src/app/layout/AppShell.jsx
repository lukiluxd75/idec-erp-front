import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/hooks/useAuth'
import { GisBackdrop, Header } from '@/shared/layout'
import { getCurrentDomain } from '@/shared/nav'
import { isWideRoute } from '@/domains'
import { Sidebar } from './Sidebar'

/**
 * Shell de la aplicación autenticada: sidebar + header + contenido de la ruta activa.
 * Cualquier ruta protegida (dashboard, módulos del ERP) se monta dentro del <Outlet/>.
 */
export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isInsideModule = Boolean(getCurrentDomain(location.pathname))

  const [sidebarOpen, setSidebarOpen] = useState(isInsideModule)
  // Al entrar o salir de un módulo, el sidebar vuelve a su estado por defecto: visible
  // dentro del módulo, oculto en Inicio (ver "Adjusting state when a prop changes" de React,
  // evita el patrón useEffect + setState que dispara un render en cascada).
  const [syncedInsideModule, setSyncedInsideModule] = useState(isInsideModule)
  if (isInsideModule !== syncedInsideModule) {
    setSyncedInsideModule(isInsideModule)
    setSidebarOpen(isInsideModule)
  }

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="relative flex h-dvh overflow-hidden text-slate-800 antialiased">
      <GisBackdrop />
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={user}
          onLogout={handleLogout}
          onToggleSidebar={isInsideModule ? () => setSidebarOpen((prev) => !prev) : undefined}
        />

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          <div className={`mx-auto space-y-6 ${isWideRoute(location.pathname) ? 'max-w-[1600px]' : 'max-w-5xl'}`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppShell

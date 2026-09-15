import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/hooks/useAuth'
import { GisBackdrop, Header } from '@/shared/layout'
import { getCurrentDomain } from '@/shared/nav'
import { isWideRoute } from '@/domains'
import { Sidebar } from './Sidebar'

/**
 * Authenticated app shell: sidebar + header + active route content.
 * Any protected route (dashboard, ERP modules) mounts inside <Outlet/>.
 */
export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isInsideModule = Boolean(getCurrentDomain(location.pathname))

  const [sidebarOpen, setSidebarOpen] = useState(isInsideModule)
  // On entering or leaving a module, sidebar resets to its default: visible inside the
  // module, hidden on Home (see React "Adjusting state when a prop changes"; avoids the
  // useEffect + setState pattern that triggers a cascading render).
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

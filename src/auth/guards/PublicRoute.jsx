import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/hooks/useAuth'
import { Spinner } from '@/shared/ui/Spinner'

export function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 text-slate-700">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-accent-500" />
          <p className="text-sm font-medium text-slate-500">Cargando...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children ? children : <Outlet />
}

export default PublicRoute

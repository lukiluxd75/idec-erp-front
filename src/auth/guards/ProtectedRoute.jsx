import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/hooks/useAuth'
import { Spinner } from '@/shared/ui/Spinner'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-accent-400" />
          <p className="text-sm font-medium text-slate-300">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children ? children : <Outlet />
}

export default ProtectedRoute

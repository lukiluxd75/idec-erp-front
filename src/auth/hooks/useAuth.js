import { useContext } from 'react'
import { AuthContext } from '@/auth/context/AuthContext'

/**
 * Hook to access the app authentication context and operations
 * @returns {{
 *   user: object | null,
 *   token: string | null,
 *   isAuthenticated: boolean,
 *   isLoading: boolean,
 *   login: Function,
 *   logout: Function,
 *   setUser: Function
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider')
  }
  return context
}

export default useAuth

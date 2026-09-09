import { useContext } from 'react'
import { AuthContext } from '@/auth/context/AuthContext'

/**
 * Hook para acceder al contexto y operaciones de autenticación de la aplicación
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

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { AuthContext } from './AuthContext'
import { authService } from '@/auth/services/auth.service'
import { userService } from '@/auth/services/user.service'
import { storageService } from '@/core/storage/storageService'
import { parseJwt } from '@/shared/utils/jwt.util'

// Margin before access_token `exp` to trigger silent refresh
const REFRESH_MARGIN_MS = 60_000
// Safety floor: never retry more often than this (avoids loops if expires_in is very short)
const MIN_REFRESH_DELAY_MS = 5_000

/**
 * Builds the full `user` object (including RBAC `permisos`) by asking the backend
 * (/api/private) — the Keycloak JWT alone (see extractUserFromToken) does not carry
 * `permisos`; those are resolved by the backend against usuario_rol_area/rol_permiso.
 * Used on mount and after login or token refresh so `permisos` never goes stale or gets
 * overwritten by the lightweight JWT-derived version.
 */
async function fetchUserProfile(token, fallbackUsername) {
  const profile = await userService.getProfile(token)
  return {
    username: profile.usuario || fallbackUsername || 'Usuario',
    email: profile.email || '',
    roles: profile.roles || [],
    clientId: profile.client_id || 'app-idec',
    idUsuario: profile.id_usuario || null,
    // Internal RBAC permissions (rol_interno -> rol_permiso -> permiso); do not confuse
    // with `roles` above (Keycloak roles — they never decide business authorization
    // directly, CLAUDE.md §5).
    permisos: profile.permisos || [],
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => authService.getCurrentSession().token)
  const [user, setUser] = useState(() => authService.getCurrentSession().user)
  const [isLoading, setIsLoading] = useState(true)
  const refreshTimerRef = useRef(null)
  // Holds the latest scheduleSilentRefresh so it can be invoked recursively from
  // inside the setTimeout without a circular reference.
  const scheduleSilentRefreshRef = useRef(() => {})

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  // Schedules a silent access_token renewal shortly before expiry so long sessions
  // with no backend calls (e.g. digitizing polygons) do not kick the user mid-work.
  const scheduleSilentRefresh = useCallback(
    (currentToken) => {
      clearRefreshTimer()

      const payload = parseJwt(currentToken)
      if (!payload?.exp) return

      const msUntilExpiry = payload.exp * 1000 - Date.now()
      const delay = Math.max(msUntilExpiry - REFRESH_MARGIN_MS, MIN_REFRESH_DELAY_MS)

      refreshTimerRef.current = setTimeout(async () => {
        try {
          const result = await authService.refreshSession()
          setToken(result.access_token)
          try {
            setUser(await fetchUserProfile(result.access_token, result.user?.username))
          } catch {
            // Profile could not be re-fetched (e.g. backend briefly down): keep the
            // current user instead of overwriting with the JWT version without `permisos`.
            setUser((prev) => prev || result.user)
          }
          scheduleSilentRefreshRef.current(result.access_token)
        } catch {
          // refresh_token also expired or no connectivity: let the next real backend
          // request trigger httpClient's reactive flow.
        }
      }, delay)
    },
    [clearRefreshTimer]
  )

  useEffect(() => {
    scheduleSilentRefreshRef.current = scheduleSilentRefresh
  }, [scheduleSilentRefresh])

  // Sync initial state and validate token with the backend on mount
  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      let session = authService.getCurrentSession()

      // access_token expired (e.g. tab was closed/inactive) but refresh_token may still
      // be valid: try restoring the session without asking for login.
      if (!session.isValid && storageService.getRefreshToken()) {
        try {
          const result = await authService.refreshSession()
          session = { token: result.access_token, user: result.user, isValid: true }
        } catch {
          authService.logout()
        }
      }

      if (!session.isValid || !session.token) {
        authService.logout()
        if (isMounted) {
          setToken(null)
          setUser(null)
          setIsLoading(false)
        }
        return
      }

      try {
        const fullUser = await fetchUserProfile(session.token, session.user?.username)
        if (isMounted) {
          setUser(fullUser)
          setToken(session.token)
          scheduleSilentRefresh(session.token)
        }
      } catch {
        if (isMounted) {
          if (session.user) {
            setUser(session.user)
            setToken(session.token)
            scheduleSilentRefresh(session.token)
          } else {
            authService.logout()
            setToken(null)
            setUser(null)
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initAuth()

    return () => {
      isMounted = false
      clearRefreshTimer()
    }
  }, [scheduleSilentRefresh, clearRefreshTimer])

  const login = useCallback(
    async ({ username, password }) => {
      const result = await authService.login({ username, password })
      setToken(result.access_token)
      try {
        setUser(await fetchUserProfile(result.access_token, result.user?.username))
      } catch {
        // Profile (with `permisos`) could not be fetched yet: use the lightweight
        // JWT-derived user as before — without `permisos`, no modules are visible until
        // the next silent refresh (or a reload) brings the full profile.
        setUser(result.user)
      }
      scheduleSilentRefresh(result.access_token)
      return result
    },
    [scheduleSilentRefresh]
  )

  const logout = useCallback(() => {
    clearRefreshTimer()
    authService.logout()
    setToken(null)
    setUser(null)
  }, [clearRefreshTimer])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && authService.isAuthenticated()),
      isLoading,
      login,
      logout,
      setUser,
    }),
    [user, token, isLoading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider

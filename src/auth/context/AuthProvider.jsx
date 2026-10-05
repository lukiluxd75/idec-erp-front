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

async function fetchUserProfile(token, fallbackUsername) {
  const profile = await userService.getProfile(token)
  return {
    username: profile.usuario || fallbackUsername || 'Usuario',
    email: profile.email || '',
    roles: profile.roles || [],
    clientId: profile.client_id || 'app-idec',
    idUsuario: profile.id_usuario || null,
    permisos: profile.permisos || [],
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => authService.getCurrentSession().token)
  const [user, setUser] = useState(() => authService.getCurrentSession().user)
  const [isLoading, setIsLoading] = useState(true)
  const refreshTimerRef = useRef(null)
  const scheduleSilentRefreshRef = useRef(() => {})

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  // Refresh the access token before it expires during long sessions.
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
            // Keep the current profile if refresh cannot fetch it.
            setUser((prev) => prev || result.user)
          }
          scheduleSilentRefreshRef.current(result.access_token)
        } catch {
          // refresh_token also expired or no connectivity: let the next real backend request trigger httpClient's reactive flow.
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

      // Refresh an expired access token when a refresh token is available.
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

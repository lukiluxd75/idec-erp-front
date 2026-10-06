import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { httpClient } from '@/core/http/httpClient'
import { storageService } from '@/core/storage/storageService'
import { extractUserFromToken, isTokenExpired } from '@/shared/utils/jwt.util'

export const authService = {
  /**
   * Authenticates the user against the backend and Keycloak
   * @param {{ username: string, password: string }} credentials
   * @returns {Promise<{ access_token: string, token_type?: string, expires_in?: number, message?: string, user: object }>}
   */
  async login({ username, password }) {
    const trimmedUsername = username?.trim()

    const data = await httpClient.post(
      API_ENDPOINTS.AUTH.LOGIN,
      {
        username: trimmedUsername,
        password,
      },
      { requiresAuth: false }
    )

    const accessToken = data.access_token

    if (!accessToken) {
      throw new Error('No se recibió el token de acceso desde el servidor de autenticación.')
    }

    // Persist token, refresh_token, and username
    storageService.setToken(accessToken)
    if (data.refresh_token) {
      storageService.setRefreshToken(data.refresh_token)
    }
    if (trimmedUsername) {
      storageService.setUsername(trimmedUsername)
    }

    const user = extractUserFromToken(accessToken, trimmedUsername)

    return {
      ...data,
      user,
    }
  },

  /**
   * Silently renews the session using the stored refresh_token,
   * without requiring the user to enter credentials again.
   * @returns {Promise<{ access_token: string, refresh_token?: string, user: object }>}
   */
  async refreshSession() {
    const refreshToken = storageService.getRefreshToken()

    if (!refreshToken) {
      throw new Error('No hay refresh_token disponible para renovar la sesión.')
    }

    const data = await httpClient.post(
      API_ENDPOINTS.AUTH.REFRESH,
      { refresh_token: refreshToken },
      { requiresAuth: false }
    )

    const accessToken = data.access_token

    if (!accessToken) {
      throw new Error('No se recibió el token de acceso al renovar la sesión.')
    }

    storageService.setToken(accessToken)
    if (data.refresh_token) {
      storageService.setRefreshToken(data.refresh_token)
    }

    const savedUsername = storageService.getUsername()
    const user = extractUserFromToken(accessToken, savedUsername)

    return {
      ...data,
      user,
    }
  },

  /** Closes the active session and clears local credentials / */
  logout() {
    storageService.clearAuth()
  },

  /**
   * Gets and validates the currently stored session
   * @returns {{ token: string | null, user: object | null, isValid: boolean }}
   */
  getCurrentSession() {
    const token = storageService.getToken()
    const savedUsername = storageService.getUsername()

    if (!token || isTokenExpired(token)) {
      return { token: null, user: null, isValid: false }
    }

    const user = extractUserFromToken(token, savedUsername)
    return { token, user, isValid: true }
  },

  /**
   * Checks whether a token exists and has not expired
   * @returns {boolean}
   */
  isAuthenticated() {
    const token = storageService.getToken()
    return Boolean(token && !isTokenExpired(token))
  },
}

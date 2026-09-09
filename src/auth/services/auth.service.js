import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { httpClient } from '@/core/http/httpClient'
import { storageService } from '@/core/storage/storageService'
import { extractUserFromToken, isTokenExpired } from '@/shared/utils/jwt.util'

/**
 * Servicio de Autenticación (Auth Domain Service)
 * Encapsula la lógica de negocio para autenticación, inicio de sesión y gestión de sesiones OIDC/Keycloak
 */
export const authService = {
  /**
   * Autentica al usuario contra el backend y Keycloak
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

    // Persistir token, refresh_token y username
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
   * Renueva la sesión silenciosamente usando el refresh_token almacenado,
   * sin requerir que el usuario vuelva a ingresar credenciales.
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

  /**
   * Cierra la sesión activa y elimina las credenciales locales
   */
  logout() {
    storageService.clearAuth()
  },

  /**
   * Obtiene y valida la sesión almacenada actualmente
   * @returns {{ token: string | null, user: object | null, isValid: boolean }}
   */
  getCurrentSession() {
    const token = storageService.getToken()
    const savedUsername = storageService.getUsername()

    if (!token || isTokenExpired(token)) {
      // No se limpia el refresh_token acá: si el access_token expiró mientras la pestaña
      // estaba cerrada/inactiva, AuthProvider intenta restaurar la sesión con él antes
      // de forzar el login (ver AuthProvider.initAuth).
      return { token: null, user: null, isValid: false }
    }

    const user = extractUserFromToken(token, savedUsername)
    return { token, user, isValid: true }
  },

  /**
   * Verifica si existe un token y no ha expirado
   * @returns {boolean}
   */
  isAuthenticated() {
    const token = storageService.getToken()
    return Boolean(token && !isTokenExpired(token))
  },
}

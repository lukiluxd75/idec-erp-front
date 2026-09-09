import { STORAGE_KEYS } from '@/core/config/storage.config'

/**
 * Servicio de almacenamiento local (Storage Service)
 * Encapsula el acceso directo a localStorage permitiendo desacoplamiento y testing
 */
export const storageService = {
  /**
   * Guarda el token de autenticación
   * @param {string} token
   */
  setToken(token) {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token)
    }
  },

  /**
   * Obtiene el token de autenticación
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  },

  /**
   * Guarda el refresh_token de la sesión
   * @param {string} refreshToken
   */
  setRefreshToken(refreshToken) {
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN, refreshToken)
    }
  },

  /**
   * Obtiene el refresh_token de la sesión
   * @returns {string|null}
   */
  getRefreshToken() {
    return localStorage.getItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN)
  },

  /**
   * Guarda el nombre de usuario de la sesión
   * @param {string} username
   */
  setUsername(username) {
    if (username) {
      localStorage.setItem(STORAGE_KEYS.AUTH_USERNAME, username)
    }
  },

  /**
   * Obtiene el nombre de usuario guardado
   * @returns {string|null}
   */
  getUsername() {
    return localStorage.getItem(STORAGE_KEYS.AUTH_USERNAME)
  },

  /**
   * Limpia todos los datos de sesión almacenados
   */
  clearAuth() {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.AUTH_USERNAME)
    localStorage.removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN)
  },
}

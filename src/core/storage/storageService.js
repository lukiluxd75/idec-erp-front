import { STORAGE_KEYS } from '@/core/config/storage.config'

/** Servicio de almacenamiento local (Storage Service) Encapsulates direct localStorage access for decoupling and testing / */
export const storageService = {
  /**
   * Stores the authentication token
   * @param {string} token
   */
  setToken(token) {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token)
    }
  },

  /**
   * Gets the authentication token
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  },

  /**
   * Stores the session refresh_token
   * @param {string} refreshToken
   */
  setRefreshToken(refreshToken) {
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN, refreshToken)
    }
  },

  /**
   * Gets the session refresh_token
   * @returns {string|null}
   */
  getRefreshToken() {
    return localStorage.getItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN)
  },

  /**
   * Stores the session username
   * @param {string} username
   */
  setUsername(username) {
    if (username) {
      localStorage.setItem(STORAGE_KEYS.AUTH_USERNAME, username)
    }
  },

  /**
   * Gets the stored username
   * @returns {string|null}
   */
  getUsername() {
    return localStorage.getItem(STORAGE_KEYS.AUTH_USERNAME)
  },

  /** Clears all stored session data / */
  clearAuth() {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.AUTH_USERNAME)
    localStorage.removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN)
  },
}

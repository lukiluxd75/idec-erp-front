import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { httpClient } from '@/core/http/httpClient'

/**
 * Servicio de Usuario (User Profile Domain Service)
 * Encapsulates user profile queries and private resources protected by roles/token
 */
export const userService = {
  /**
   * Fetches private profile info from the backend (/api/private)
   * @param {string} [token] - Optional token; if omitted, httpClient uses the stored token
   * @returns {Promise<{ message: string, usuario: string, email: string, roles: string[], client_id: string }>}
   */
  async getProfile(token) {
    return httpClient.get(API_ENDPOINTS.USER.PRIVATE_PROFILE, { token })
  },

  /**
   * Changes the authenticated user's password against Keycloak (via POST /api/change-password).
   * Backend validates `current_password` and applies the new one using the session access_token.
   * @param {{ currentPassword: string, newPassword: string }} payload
   * @returns {Promise<void>}
   */
  async changePassword({ currentPassword, newPassword }) {
    await httpClient.post(API_ENDPOINTS.USER.CHANGE_PASSWORD, {
      current_password: currentPassword,
      new_password: newPassword,
    })
  },

  /**
   * Changes the institutional user's password directly in the Zentyal directory
   * (via POST /api/change-password-institutional). Does not validate `currentPassword` against
   * the directory (backend uses an administrative service account) — the Bearer session
   * already proves the user identity.
   * @param {{ username: string, newPassword: string }} payload
   * @returns {Promise<void>}
   */
  async changeInstitutionalPassword({ username, newPassword }) {
    await httpClient.post(API_ENDPOINTS.USER.CHANGE_PASSWORD_INSTITUTIONAL, {
      username,
      new_password: newPassword,
    })
  },
}

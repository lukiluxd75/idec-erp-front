import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { httpClient } from '@/core/http/httpClient'

/**
 * Servicio de Usuario (User Profile Domain Service)
 * Encapsula la consulta de perfil de usuario y recursos privados protegidos por roles/token
 */
export const userService = {
  /**
   * Obtiene la información del perfil privado desde el backend (/api/private)
   * @param {string} [token] - Token opcional; si no se especifica, httpClient usará el token guardado
   * @returns {Promise<{ message: string, usuario: string, email: string, roles: string[], client_id: string }>}
   */
  async getProfile(token) {
    return httpClient.get(API_ENDPOINTS.USER.PRIVATE_PROFILE, { token })
  },

  /**
   * Cambia la contraseña del usuario autenticado contra Keycloak (vía POST /api/change-password).
   * El backend valida `current_password` y aplica la nueva usando el access_token de la sesión.
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
   * Cambia la contraseña del usuario institucional directamente en el directorio Zentyal
   * (vía POST /api/change-password-institucional). No valida `currentPassword` contra el
   * directorio (el backend usa una cuenta de servicio administrativa) — la sesión Bearer
   * ya prueba la identidad del usuario.
   * @param {{ username: string, newPassword: string }} payload
   * @returns {Promise<void>}
   */
  async changeInstitutionalPassword({ username, newPassword }) {
    await httpClient.post(API_ENDPOINTS.USER.CHANGE_PASSWORD_INSTITUCIONAL, {
      username,
      new_password: newPassword,
    })
  },
}

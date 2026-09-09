import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { httpClient } from '@/core/http/httpClient'

/**
 * Servicio del Sistema y Diagnóstico (Health Domain Service)
 * Encapsula la verificación de conectividad y estado del backend
 */
export const healthService = {
  /**
   * Consulta el endpoint público de estado (/api/public)
   * @returns {Promise<{ message: string, status?: string }>}
   */
  async checkPublicStatus() {
    return httpClient.get(API_ENDPOINTS.SYSTEM.PUBLIC_HEALTH, { requiresAuth: false })
  },
}

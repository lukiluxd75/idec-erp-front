import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { httpClient } from '@/core/http/httpClient'

/** System and diagnostics service (Health Domain Service) Encapsulates backend connectivity and status checks / */
export const healthService = {
  /**
   * Queries the public status endpoint (/api/public)
   * @returns {Promise<{ message: string, status?: string }>}
   */
  async checkPublicStatus() {
    return httpClient.get(API_ENDPOINTS.SYSTEM.PUBLIC_HEALTH, { requiresAuth: false })
  },
}

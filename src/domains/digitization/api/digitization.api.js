import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'

/**
 * ERP digitization domain. The vision model runs on the architects' PCs (Ollama);
 * the backend only dispatches jobs to them and reports their live status.
 */
export const digitizationApi = {
  listWorkers: () => httpClient.get(API_ENDPOINTS.DIGITIZATION.WORKERS),
}

import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'

/**
 * ERP digitization domain. The vision model runs on the architects' PCs (Ollama);
 * the backend only dispatches jobs to them and reports their live status.
 */
export const digitizationApi = {
  listWorkers: () => httpClient.get(API_ENDPOINTS.DIGITIZATION.WORKERS),

  /**
   * Gives up on the digitization that PC is running. The backend answers as soon
   * as it takes note, but the PC needs a moment to let go, so the card keeps
   * showing it as working until the next refresh.
   */
  stopWorker: (host) => httpClient.post(API_ENDPOINTS.DIGITIZATION.STOP_WORKER, { host }),
}

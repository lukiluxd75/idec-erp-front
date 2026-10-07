import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'

/** ERP digitization domain. */
export const digitizationApi = {
  listWorkers: () => httpClient.get(API_ENDPOINTS.DIGITIZATION.WORKERS),

  /** Gives up on the digitization that PC is running. */
  stopWorker: (host) => httpClient.post(API_ENDPOINTS.DIGITIZATION.STOP_WORKER, { host }),
}

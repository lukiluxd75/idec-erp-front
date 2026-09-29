import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'

/**
 * ERP folios domain. Folios are uploaded from the mobile app ("Escaneo Folios")
 * and extracted in the backend (OpenCV + GAMC OCR); the web only lists,
 * reviews/corrects and confirms them.
 */
export const foliosApi = {
  list: () => httpClient.get(API_ENDPOINTS.FOLIOS.BASE),

  get: (id) => httpClient.get(API_ENDPOINTS.FOLIOS.ONE(id)),

  // Requires Bearer -> cannot be a direct <img src>; downloaded as Blob and the
  // page builds (and revokes) the objectURL.
  pageBlob: (id, index, upright = true) =>
    httpClient.get(API_ENDPOINTS.FOLIOS.PAGE(id, index, upright), { responseType: 'blob' }),

  diagnostics: (id) => httpClient.get(API_ENDPOINTS.FOLIOS.DIAGNOSTICS(id)),

  // How the last extraction filled each field ({} if the folio has no log yet).
  fillLog: (id) => httpClient.get(API_ENDPOINTS.FOLIOS.FILL_LOG(id)),

  save: (id, data, confirm = false) => httpClient.put(API_ENDPOINTS.FOLIOS.ONE(id), { data, confirm }),

  reprocess: (id) => httpClient.post(API_ENDPOINTS.FOLIOS.REPROCESS(id)),

  remove: (id) => httpClient.delete(API_ENDPOINTS.FOLIOS.ONE(id)),
}

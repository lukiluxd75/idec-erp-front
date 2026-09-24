import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'

/**
 * ERP facturas domain. Receipts ("FUR - comprobante de pago") are photographed
 * from the mobile app ("Escaneo de Facturas") and read in the backend (OpenCV +
 * GAMC OCR); the web only lists, reviews/corrects and confirms them.
 */
export const facturasApi = {
  list: () => httpClient.get(API_ENDPOINTS.FACTURAS.BASE),

  get: (id) => httpClient.get(API_ENDPOINTS.FACTURAS.ONE(id)),

  // Requires Bearer -> cannot be a direct <img src>; downloaded as Blob and the
  // page builds (and revokes) the objectURL.
  imageBlob: (id, upright = true) => httpClient.get(API_ENDPOINTS.FACTURAS.IMAGE(id, upright), { responseType: 'blob' }),

  // How the last extraction filled each field ({} if the receipt has no log yet).
  fillLog: (id) => httpClient.get(API_ENDPOINTS.FACTURAS.FILL_LOG(id)),

  save: (id, data, confirm = false) => httpClient.put(API_ENDPOINTS.FACTURAS.ONE(id), { data, confirm }),

  reprocess: (id) => httpClient.post(API_ENDPOINTS.FACTURAS.REPROCESS(id)),

  remove: (id) => httpClient.delete(API_ENDPOINTS.FACTURAS.ONE(id)),
}

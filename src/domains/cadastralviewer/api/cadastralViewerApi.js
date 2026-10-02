import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ENV } from '@/core/config/env.config'
import { httpClient } from '@/core/http/httpClient'

const endpoints = API_ENDPOINTS.CADASTRAL_VIEWER

export const cadastralViewerApi = {
  listProcedures: (admin = false) => httpClient.get(admin ? endpoints.ADMIN_PROCEDURES : endpoints.PROCEDURES, { requiresAuth: admin }),
  saveProcedure: (payload, id) => id
    ? httpClient.put(endpoints.PROCEDURE(id), payload)
    : httpClient.post(endpoints.PROCEDURES, payload),
  deleteProcedure: (id) => httpClient.delete(endpoints.PROCEDURE(id)),

  listLayers: (admin = false) => httpClient.get(admin ? endpoints.ADMIN_LAYERS : endpoints.LAYERS, { requiresAuth: admin }),
  searchMapFeatures: (kind, query) => httpClient.get(
    `${endpoints.SEARCH}?kind=${encodeURIComponent(kind)}&q=${encodeURIComponent(query)}`,
    { requiresAuth: false },
  ),
  saveLayer: (payload, id) => id
    ? httpClient.put(endpoints.LAYER(id), payload)
    : httpClient.post(endpoints.LAYERS, payload),
  deleteLayer: (id) => httpClient.delete(endpoints.LAYER(id)),

  listAdvertisements: (admin = false) => httpClient.get(admin ? endpoints.ADMIN_ADVERTISEMENTS : endpoints.ADVERTISEMENTS, { requiresAuth: admin }),
  saveAdvertisementLink: (payload) => httpClient.post(endpoints.ADVERTISEMENTS, payload),
  uploadAdvertisement: (formData) => httpClient.post(endpoints.UPLOAD_ADVERTISEMENT, formData),
  updateAdvertisement: (id, payload) => httpClient.put(endpoints.ADVERTISEMENT(id), payload),
  deleteAdvertisement: (id) => httpClient.delete(endpoints.ADVERTISEMENT(id)),
}

export function getAdvertisementUrl(advertisement) {
  if (!advertisement?.download_url) return ''
  if (/^https?:\/\//i.test(advertisement.download_url)) return advertisement.download_url
  return `${ENV.API_BASE_URL}${advertisement.download_url}`
}
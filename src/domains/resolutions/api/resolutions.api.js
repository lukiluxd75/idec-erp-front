import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ENV } from '@/core/config/env.config'
import { ApiError } from '@/core/errors'

/** ---- Module backend (ERP resolutions domain) ---- */

export const resolutionsApi = {
  list: () => httpClient.get(API_ENDPOINTS.RESOLUTIONS.BASE),

  // Creates a resolution with its scanned pages, in upload order — the "Escanear"
  // flow from NewResolutionPage (before this, only an external mobile app could
  // POST here).
  create: (name, resolutionNumber, files) => {
    const fd = new FormData()
    fd.append('name', name)
    fd.append('resolution_number', resolutionNumber)
    files.forEach((file) => fd.append('pages', file))
    return httpClient.post(API_ENDPOINTS.RESOLUTIONS.BASE, fd)
  },

  get: (id) => httpClient.get(API_ENDPOINTS.RESOLUTIONS.ONE(id)),

  // Image endpoint requires Bearer, so it cannot be used as a direct <img src="...">:
  // download as Blob; the page builds the objectURL (and revokes it).
  pageBlob: (id, orden) =>
    httpClient.get(API_ENDPOINTS.RESOLUTIONS.PAGE(id, orden), { responseType: 'blob' }),

  saveTable: (id, tableData, status) =>
    httpClient.put(API_ENDPOINTS.RESOLUTIONS.TABLE(id), { table_data: tableData, status }),

  remove: (id) => httpClient.delete(API_ENDPOINTS.RESOLUTIONS.ONE(id)),

  // Presence snapshot polled by useResolutionsUpdates.js — cross-worker-safe
  // fallback for PhoneConnectedBadge, see ResolutionsConnectionManager.is_mobile_connected.
  getPresence: () => httpClient.get(API_ENDPOINTS.RESOLUTIONS.PRESENCE),

  // Paginas del plano de division (para colindancias) -- mismo endpoint que
  // usa (o va a usar) la app movil, "source" es solo metadata de quien subio.
  planPageBlob: (id, orden) =>
    httpClient.get(API_ENDPOINTS.RESOLUTIONS.PLAN_PAGE(id, orden), { responseType: 'blob' }),

  // Una foto puede ir con varias plantas (plano tipo) separadas por "|", o
  // sin ninguna: entonces el backend la lee del título del plano.
  addPlanPages: (id, paginas) => {
    const fd = new FormData()
    paginas.forEach(({ blob, plantas = [] }, i) => {
      fd.append('pages', blob, `plano_${i + 1}.jpg`)
      fd.append('plantas', plantas.join('|'))
    })
    fd.append('source', 'web')
    return httpClient.post(API_ENDPOINTS.RESOLUTIONS.PLAN_PAGES(id), fd)
  },

  removePlanPage: (id, orden) => httpClient.delete(API_ENDPOINTS.RESOLUTIONS.PLAN_PAGE(id, orden)),

  setPlanPagePlantas: (id, orden, plantas) =>
    httpClient.put(API_ENDPOINTS.RESOLUTIONS.PLAN_PAGE_PLANTAS(id, orden), { plantas }),

  detectPlanPagePlanta: (id, orden) => httpClient.post(API_ENDPOINTS.RESOLUTIONS.PLAN_PAGE_DETECT(id, orden)),
}

/** ---- GAMC OCR service (browser calls it directly, same as geoextraction) ---- */

async function ocrUpload(blob, filename = 'pagina.jpg') {
  const fd = new FormData()
  fd.append('file', blob, filename)
  const res = await fetch(`${ENV.OCR_API_URL}/ocr/`, { method: 'POST', body: fd })
  if (!res.ok) throw new ApiError(`El servicio OCR respondió ${res.status}`, res.status)
  const data = await res.json()
  if (!data.job_id) throw new ApiError('El servicio OCR no devolvió job_id.')
  return data.job_id
}

async function ocrWait(jobId, { maxIntentos = 40, intervaloMs = 2000 } = {}) {
  for (let i = 0; i < maxIntentos; i++) {
    const res = await fetch(`${ENV.OCR_API_URL}/ocr/result/${jobId}/json`)
    if (!res.ok) throw new ApiError(`El servicio OCR respondió ${res.status}`, res.status)
    const data = await res.json()
    if (data.status === 'done') return data.result?.result || []
    if (data.status === 'failed') throw new ApiError('El servicio OCR marcó el trabajo como fallido.')
    await new Promise((r) => setTimeout(r, intervaloMs))
  }
  throw new ApiError('Tiempo agotado esperando el resultado del OCR.')
}

/** Runs OCR on an image blob and returns raw blocks { points, text, confidence }. */
export async function ocrImage(blob, filename) {
  const jobId = await ocrUpload(blob, filename)
  return ocrWait(jobId)
}

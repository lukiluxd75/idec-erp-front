import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ENV } from '@/core/config/env.config'
import { ApiError } from '@/core/errors'

/** ---- Backend del modulo (dominio resoluciones del ERP) ---- */

export const resolucionesApi = {
  listar: () => httpClient.get(API_ENDPOINTS.RESOLUCIONES.BASE),

  obtener: (id) => httpClient.get(API_ENDPOINTS.RESOLUCIONES.ONE(id)),

  // El endpoint de la imagen pide Bearer, asi que no sirve como <img src="...">
  // directo: se baja como Blob y la pagina arma el objectURL (y lo revoca).
  paginaBlob: (id, orden) =>
    httpClient.get(API_ENDPOINTS.RESOLUCIONES.PAGINA(id, orden), { responseType: 'blob' }),

  guardarTabla: (id, tabla, estado) =>
    httpClient.put(API_ENDPOINTS.RESOLUCIONES.TABLA(id), { tabla, estado }),

  eliminar: (id) => httpClient.delete(API_ENDPOINTS.RESOLUCIONES.ONE(id)),
}

/** ---- Servicio OCR de GAMC (el navegador le pega directo, igual que geoextraccion) ---- */

async function ocrSubir(blob, filename = 'pagina.jpg') {
  const fd = new FormData()
  fd.append('file', blob, filename)
  const res = await fetch(`${ENV.OCR_API_URL}/ocr/`, { method: 'POST', body: fd })
  if (!res.ok) throw new ApiError(`El servicio OCR respondió ${res.status}`, res.status)
  const data = await res.json()
  if (!data.job_id) throw new ApiError('El servicio OCR no devolvió job_id.')
  return data.job_id
}

async function ocrEsperar(jobId, { maxIntentos = 40, intervaloMs = 2000 } = {}) {
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

/** Corre OCR sobre un blob de imagen y devuelve los bloques crudos { points, text, confidence }. */
export async function ocrImagen(blob, filename) {
  const jobId = await ocrSubir(blob, filename)
  return ocrEsperar(jobId)
}

import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ENV } from '@/core/config/env.config'
import { ApiError } from '@/core/errors'
import { processAndFilterOCRData } from '../utils/ocrParser'

/**
 * Generates a Shapefile (ZIP) on the ERP backend from one or more digitized parcels.
 * @param {{ terrenos: Array<{ puntos: Array<{x:number,y:number}>, atributos: Record<string,string> }> }} payload
 * @returns {Promise<Blob>}
 */
function generateShapefile(payload) {
  return httpClient.post(API_ENDPOINTS.GEOEXTRACTION.GENERATE_SHAPEFILE, payload, { responseType: 'blob' })
}

/**
 * Merges several uploaded Shapefile ZIPs into a single layer on the ERP backend.
 * @param {File[]} files
 * @returns {Promise<Blob>}
 */
function mergeShapefiles(files) {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  return httpClient.post(API_ENDPOINTS.GEOEXTRACTION.MERGE_SHAPEFILES, formData, { responseType: 'blob' })
}

/**
 * External OCR service (outside the ERP backend, see VITE_OCR_API_URL) — same
 * behavior as the original project, only relocated into this domain.
 */
async function uploadOcrImage(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${ENV.OCR_API_URL}/ocr/`, { method: 'POST', body: formData })
  if (!response.ok) {
    throw new ApiError('No se pudo subir la imagen al servicio OCR.', response.status)
  }
  const data = await response.json()
  return data.job_id
}

async function waitForOcrResult(jobId) {
  const maxIntentos = 30
  let intentos = 0
  while (intentos < maxIntentos) {
    const response = await fetch(`${ENV.OCR_API_URL}/ocr/result/${jobId}/json`)
    const data = await response.json()

    if (data.status === 'done') {
      return processAndFilterOCRData(data.result.result)
    }
    if (data.status === 'failed') throw new ApiError('Error en el servidor OCR.')

    await new Promise((resolve) => setTimeout(resolve, 2000))
    intentos++
  }
  throw new ApiError('Tiempo agotado esperando el resultado del OCR.')
}

/**
 * Captures sent from the mobile app (geoextract mobile: take photo and upload —
 * crop and OCR still happen on this page). Stored in ERP process memory, not DB:
 * the list is ephemeral.
 */
function listCaptures() {
  return httpClient.get(API_ENDPOINTS.GEOEXTRACTION.CAPTURES)
}

function captureBlob(id) {
  return httpClient.get(API_ENDPOINTS.GEOEXTRACTION.CAPTURE_IMAGE(id), { responseType: 'blob' })
}

function discardCapture(id) {
  return httpClient.delete(API_ENDPOINTS.GEOEXTRACTION.CAPTURE(id))
}

/**
 * Presence snapshot polled by useCapturesUpdates.js — cross-worker-safe
 * fallback for PhoneConnectedBadge, see CapturesConnectionManager.is_mobile_connected.
 */
function getPresence() {
  return httpClient.get(API_ENDPOINTS.GEOEXTRACTION.CAPTURES_PRESENCE)
}

export const geoextractionApi = {
  generateShapefile,
  mergeShapefiles,
  uploadOcrImage,
  waitForOcrResult,
  listCaptures,
  captureBlob,
  discardCapture,
  getPresence,
}

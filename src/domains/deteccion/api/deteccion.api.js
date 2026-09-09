import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ENV } from '@/core/config/env.config'
import { storageService } from '@/core/storage/storageService'

function health() {
  return httpClient.get(API_ENDPOINTS.DETECCION.SALUD)
}

function listWmsLayers() {
  return httpClient.get(API_ENDPOINTS.DETECCION.WMS_CAPAS)
}

function startDetectWms(payload) {
  return httpClient.post(API_ENDPOINTS.DETECCION.DETECTAR_WMS, payload)
}

function getProgress(jobId) {
  return httpClient.get(API_ENDPOINTS.DETECCION.PROGRESO(jobId))
}

function getResult(jobId) {
  return httpClient.get(API_ENDPOINTS.DETECCION.RESULTADO(jobId))
}

function cancelJob(jobId) {
  return httpClient.post(API_ENDPOINTS.DETECCION.CANCELAR(jobId), {})
}

function getAlignManual(jobId) {
  return httpClient.get(API_ENDPOINTS.DETECCION.ALINEACION(jobId))
}

function previewAlignManual(jobId, payload) {
  return httpClient.post(API_ENDPOINTS.DETECCION.ALINEACION_PREVIEW(jobId), payload)
}

function applyAlignManual(jobId, payload) {
  return httpClient.post(API_ENDPOINTS.DETECCION.ALINEACION_APLICAR(jobId), payload)
}

function getRegistroCatastral(idRegistro) {
  return httpClient.get(API_ENDPOINTS.DETECCION.REGISTRO_CATASTRAL(idRegistro))
}

/**
 * Engine image URLs already come rewritten as `/api/deteccion/motor/...`.
 * Attach the ERP base URL + bearer via fetch blob URL for <img> tags.
 */
async function resolveAssetObjectUrl(proxyPath) {
  if (!proxyPath) return null
  const path = proxyPath.startsWith('http') ? proxyPath : `${ENV.API_BASE_URL}${proxyPath}`
  const token = storageService.getToken()
  const response = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error(`No se pudo cargar el recurso (${response.status})`)
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export const deteccionApi = {
  health,
  listWmsLayers,
  startDetectWms,
  getProgress,
  getResult,
  cancelJob,
  getAlignManual,
  previewAlignManual,
  applyAlignManual,
  getRegistroCatastral,
  resolveAssetObjectUrl,
}

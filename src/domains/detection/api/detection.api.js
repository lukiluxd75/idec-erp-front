import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ENV } from '@/core/config/env.config'
import { storageService } from '@/core/storage/storageService'

function health() {
  return httpClient.get(API_ENDPOINTS.DETECTION.HEALTH)
}

function listWmsLayers() {
  return httpClient.get(API_ENDPOINTS.DETECTION.WMS_LAYERS)
}

function startDetectWms(payload) {
  return httpClient.post(API_ENDPOINTS.DETECTION.DETECT_WMS, payload)
}

function getProgress(jobId) {
  return httpClient.get(API_ENDPOINTS.DETECTION.PROGRESS(jobId))
}

function getResult(jobId) {
  return httpClient.get(API_ENDPOINTS.DETECTION.RESULT(jobId))
}

function cancelJob(jobId) {
  return httpClient.post(API_ENDPOINTS.DETECTION.CANCEL(jobId), {})
}

function getAlignManual(jobId) {
  return httpClient.get(API_ENDPOINTS.DETECTION.MANUAL_ALIGN(jobId))
}

function previewAlignManual(jobId, payload) {
  return httpClient.post(API_ENDPOINTS.DETECTION.MANUAL_ALIGN_PREVIEW(jobId), payload)
}

function applyAlignManual(jobId, payload) {
  return httpClient.post(API_ENDPOINTS.DETECTION.MANUAL_ALIGN_APPLY(jobId), payload)
}

function getCadastralRecord(idRegistro) {
  return httpClient.get(API_ENDPOINTS.DETECTION.CADASTRAL_RECORD(idRegistro))
}

function listCampaigns() {
  return httpClient.get(API_ENDPOINTS.DETECTION.CAMPAIGNS)
}

function createCampaign(payload) {
  return httpClient.post(API_ENDPOINTS.DETECTION.CAMPAIGNS, payload)
}

function reviewAffectedParcel(affectedParcelId, payload) {
  return httpClient.post(API_ENDPOINTS.DETECTION.AFFECTED_PARCEL_REVIEW(affectedParcelId), payload)
}

function listProcessedSectors(campaignId) {
  const query = campaignId ? `?campaign_id=${campaignId}` : ''
  return httpClient.get(`${API_ENDPOINTS.DETECTION.SECTORS}${query}`)
}

function getProcessedSectorDetail(sectorId) {
  return httpClient.get(API_ENDPOINTS.DETECTION.SECTOR_DETAIL(sectorId))
}

/**
 * Engine image URLs already come rewritten as `/api/detection/engine/...`.
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

export const detectionApi = {
  health,
  listWmsLayers,
  startDetectWms,
  getProgress,
  getResult,
  cancelJob,
  getAlignManual,
  previewAlignManual,
  applyAlignManual,
  getCadastralRecord,
  resolveAssetObjectUrl,
  listCampaigns,
  createCampaign,
  reviewAffectedParcel,
  listProcessedSectors,
  getProcessedSectorDetail,
}

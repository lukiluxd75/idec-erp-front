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

function listProcessedSectors(campaignId, { unassignedOnly = false } = {}) {
  const params = new URLSearchParams()
  if (campaignId) params.set('campaign_id', campaignId)
  else if (unassignedOnly) params.set('unassigned_only', 'true')
  const query = params.toString()
  return httpClient.get(`${API_ENDPOINTS.DETECTION.SECTORS}${query ? `?${query}` : ''}`)
}

function getProcessedSectorDetail(sectorId) {
  return httpClient.get(API_ENDPOINTS.DETECTION.SECTOR_DETAIL(sectorId))
}

function resumeSectorValidation(sectorId) {
  return httpClient.get(`${API_ENDPOINTS.DETECTION.SECTOR_DETAIL(sectorId)}/resume-validation`)
}

function exportParams(campaignId, unassignedOnly) {
  const params = new URLSearchParams()
  if (campaignId) params.set('campaign_id', campaignId)
  else if (unassignedOnly) params.set('unassigned_only', 'true')
  return params.toString()
}

function fetchCampaignReportData(campaignId, { unassignedOnly = false } = {}) {
  const query = exportParams(campaignId, unassignedOnly)
  return httpClient.get(`${API_ENDPOINTS.DETECTION.SECTORS}/export/data?${query}`)
}

/** Downloads a file export (Excel/PDF) of the campaign's confirmed/rejected parcels. */
async function downloadCampaignReportFile(kind, campaignId, { unassignedOnly = false } = {}) {
  const query = exportParams(campaignId, unassignedOnly)
  const path = `${API_ENDPOINTS.DETECTION.SECTORS}/export/${kind}?${query}`
  const token = storageService.getToken()
  const response = await fetch(`${ENV.API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error(`No se pudo generar el reporte (${response.status})`)
  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  const filename = match ? match[1] : `reporte-predios.${kind === 'excel' ? 'xlsx' : 'pdf'}`
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function exportCampaignReport(campaignId, opts) {
  return downloadCampaignReportFile('excel', campaignId, opts)
}

function exportCampaignReportPdf(campaignId, opts) {
  return downloadCampaignReportFile('pdf', campaignId, opts)
}

/** Engine image URLs already come rewritten as `/api/detection/engine/...`. */
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
  resumeSectorValidation,
  fetchCampaignReportData,
  exportCampaignReport,
  exportCampaignReportPdf,
}

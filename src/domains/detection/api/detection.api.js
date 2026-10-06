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

/** Cross-entity search (sector id/name, predio por código catastral, campaña
 * por código/nombre) -- backs MapSearchBox, shared by "Mapa y detección" and
 * "Historial" so neither re-implements its own search. */
function searchDetectionEntities(query, { limit = 8 } = {}) {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  return httpClient.get(`${API_ENDPOINTS.DETECTION.SECTORS}/search?${params.toString()}`)
}

/** Aggregated numbers for "Reportes"'s charts -- see the backend's
 * SectorHistoryPort.get_report_stats for the exact bundle shape. */
function getReportStats({ campaignId, dateFrom, dateTo } = {}) {
  const params = new URLSearchParams()
  if (campaignId) params.set('campaign_id', campaignId)
  if (dateFrom) params.set('date_from', dateFrom)
  if (dateTo) params.set('date_to', dateTo)
  const query = params.toString()
  return httpClient.get(`${API_ENDPOINTS.DETECTION.REPORT_STATS}${query ? `?${query}` : ''}`)
}

/** "Continuar validación": the sector's persisted result, shaped just like
 * a live job's job_result -- feed it straight into the same Hallazgos table. */
function resumeSectorValidation(sectorId) {
  return httpClient.get(`${API_ENDPOINTS.DETECTION.SECTOR_DETAIL(sectorId)}/resume-validation`)
}

function exportParams(campaignId, unassignedOnly, allCampaigns) {
  const params = new URLSearchParams()
  if (allCampaigns) params.set('all_campaigns', 'true')
  else if (campaignId) params.set('campaign_id', campaignId)
  else if (unassignedOnly) params.set('unassigned_only', 'true')
  return params.toString()
}

/** The "Exportar" preview modal's data source -- same confirmed/rejected
 * rows the Excel/PDF exports use, already carrying their display labels.
 * `allCampaigns` backs the modal's own "Todas las campañas" option -- every
 * confirmed/rejected parcel regardless of campaign, overriding campaignId/
 * unassignedOnly, so the report shows which campaign each sector belongs to. */
function fetchCampaignReportData(campaignId, { unassignedOnly = false, allCampaigns = false } = {}) {
  const query = exportParams(campaignId, unassignedOnly, allCampaigns)
  return httpClient.get(`${API_ENDPOINTS.DETECTION.SECTORS}/export/data?${query}`)
}

async function downloadBlobResponse(response, fallbackFilename) {
  if (!response.ok) throw new Error(`No se pudo generar el reporte (${response.status})`)
  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  const filename = match ? match[1] : fallbackFilename
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Downloads a file export (Excel/PDF) of the campaign's confirmed/rejected
 * parcels. A binary file response, so this bypasses httpClient (JSON-only)
 * the same way resolveAssetObjectUrl does, but triggers a save instead of an
 * object URL. */
async function downloadCampaignReportFile(kind, campaignId, { unassignedOnly = false, allCampaigns = false } = {}) {
  const query = exportParams(campaignId, unassignedOnly, allCampaigns)
  const path = `${API_ENDPOINTS.DETECTION.SECTORS}/export/${kind}?${query}`
  const token = storageService.getToken()
  const response = await fetch(`${ENV.API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  await downloadBlobResponse(response, `reporte-predios.${kind === 'excel' ? 'xlsx' : 'pdf'}`)
}

/** Same PDF as the plain GET export, plus one page per chart image --
 * "Reportes" captures its own live charts as PNGs (html2canvas) before
 * calling this, since a GET query string can't carry that much image data;
 * needs a POST body instead. */
async function downloadCampaignReportPdfWithCharts(
  campaignId,
  { unassignedOnly = false, allCampaigns = false } = {},
  charts = []
) {
  const query = exportParams(campaignId, unassignedOnly, allCampaigns)
  const path = `${API_ENDPOINTS.DETECTION.SECTORS}/export/pdf?${query}`
  const token = storageService.getToken()
  const response = await fetch(`${ENV.API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ charts }),
  })
  await downloadBlobResponse(response, 'reporte-predios.pdf')
}

function exportCampaignReport(campaignId, opts) {
  return downloadCampaignReportFile('excel', campaignId, opts)
}

/** `charts`, when non-empty, switches to the POST endpoint that appends one
 * page per chart image -- see downloadCampaignReportPdfWithCharts. */
function exportCampaignReportPdf(campaignId, opts, charts) {
  if (charts && charts.length) return downloadCampaignReportPdfWithCharts(campaignId, opts, charts)
  return downloadCampaignReportFile('pdf', campaignId, opts)
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
  searchDetectionEntities,
  getReportStats,
  resumeSectorValidation,
  fetchCampaignReportData,
  exportCampaignReport,
  exportCampaignReportPdf,
}

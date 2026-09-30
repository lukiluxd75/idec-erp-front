import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ENV } from '@/core/config/env.config'
import { storageService } from '@/core/storage/storageService'

function listWmsLayers() {
  return httpClient.get(API_ENDPOINTS.ALIGNMENT.WMS_LAYERS)
}

/**
 * Raw WMS PNG for a bbox, as a blob object URL -- the "before" imagery
 * AlignmentPage warps client-side onto a block's fitted transform (see
 * utils/correctedOverlay.js). Fetched with the bearer token like
 * detectionApi.resolveAssetObjectUrl, not via <img src=...>, since the
 * endpoint is permission-gated.
 */
async function fetchWmsImageObjectUrl({ host, service, bbox, width = 1024, height = 1024 }) {
  const params = new URLSearchParams({
    host,
    service,
    min_lon: bbox[0],
    min_lat: bbox[1],
    max_lon: bbox[2],
    max_lat: bbox[3],
    width,
    height,
  })
  const path = `${ENV.API_BASE_URL}${API_ENDPOINTS.ALIGNMENT.WMS_IMAGE}?${params.toString()}`
  const token = storageService.getToken()
  const response = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error(`No se pudo cargar la imagen WMS (${response.status})`)
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

function listBlocks(year) {
  return httpClient.get(`${API_ENDPOINTS.ALIGNMENT.BLOCKS}?year=${year}`)
}

function getBlock(id) {
  return httpClient.get(API_ENDPOINTS.ALIGNMENT.BLOCK(id))
}

function createBlock(payload) {
  return httpClient.post(API_ENDPOINTS.ALIGNMENT.BLOCKS, payload)
}

function updateBlock(id, payload) {
  return httpClient.put(API_ENDPOINTS.ALIGNMENT.BLOCK(id), payload)
}

function confirmBlock(id) {
  return httpClient.post(API_ENDPOINTS.ALIGNMENT.BLOCK_CONFIRM(id), {})
}

function deleteBlock(id) {
  return httpClient.delete(API_ENDPOINTS.ALIGNMENT.BLOCK(id))
}

function getCoverage(year) {
  return httpClient.get(`${API_ENDPOINTS.ALIGNMENT.COVERAGE}?year=${year}`)
}

export const alignmentApi = {
  listWmsLayers,
  fetchWmsImageObjectUrl,
  listBlocks,
  getBlock,
  createBlock,
  updateBlock,
  confirmBlock,
  deleteBlock,
  getCoverage,
}

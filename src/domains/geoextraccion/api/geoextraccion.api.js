import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ENV } from '@/core/config/env.config'
import { ApiError } from '@/core/errors'
import { processAndFilterOCRData } from '../utils/ocrParser'

/**
 * Genera un Shapefile (ZIP) en el backend del ERP a partir de uno o más terrenos digitalizados.
 * @param {{ terrenos: Array<{ puntos: Array<{x:number,y:number}>, atributos: Record<string,string> }> }} payload
 * @returns {Promise<Blob>}
 */
function generarShapefile(payload) {
  return httpClient.post(API_ENDPOINTS.GEOEXTRACCION.GENERAR_SHAPEFILE, payload, { responseType: 'blob' })
}

/**
 * Une varios Shapefiles (ZIP) subidos en una sola capa, en el backend del ERP.
 * @param {File[]} files
 * @returns {Promise<Blob>}
 */
function fusionarShapefiles(files) {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  return httpClient.post(API_ENDPOINTS.GEOEXTRACCION.FUSIONAR_SHAPEFILES, formData, { responseType: 'blob' })
}

/**
 * Servicio OCR externo (fuera del backend del ERP, ver VITE_OCR_API_URL) — se mantiene sin
 * cambios de comportamiento respecto al proyecto original, solo relocalizado a este dominio.
 */
async function subirImagenOCR(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${ENV.OCR_API_URL}/ocr/`, { method: 'POST', body: formData })
  if (!response.ok) {
    throw new ApiError('No se pudo subir la imagen al servicio OCR.', response.status)
  }
  const data = await response.json()
  return data.job_id
}

async function esperarResultadoOCR(jobId) {
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

export const geoextraccionApi = {
  generarShapefile,
  fusionarShapefiles,
  subirImagenOCR,
  esperarResultadoOCR,
}

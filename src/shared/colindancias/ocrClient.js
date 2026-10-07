import { ENV } from '@/core/config/env.config'
import { ApiError } from '@/core/errors'

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

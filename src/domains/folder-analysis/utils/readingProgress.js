import {
  ASSEMBLE_SECONDS,
  SEALS_SECONDS,
  VISION_SECONDS,
} from '@/domains/folder-analysis/utils/readingStats'

/** How far along a document's analysis is. */
const QUEUE_BAND = 8 // 0 -> 8   waiting for its turn
const READ_BAND = 84 // 8 -> 92  one slice per photo
const ASSEMBLE_BAND = 6 // 92 -> 98  putting the data together
const READING_TOP = QUEUE_BAND + READ_BAND

const SEALS_START = READING_TOP // 92 -> 95  buscando y leyendo los sellos
const SEALS_BAND = 3
const VISION_START = SEALS_START + SEALS_BAND // 95 -> 99  qwen3-vl mirando la foto
const VISION_BAND = 4

const CREEP_TAU = 0.6

/** Approaches `band` as `elapsed` grows, without ever reaching it. */
function creep(band, elapsedSec, expectedSec) {
  if (!(elapsedSec > 0) || !(expectedSec > 0)) return 0
  return band * (1 - Math.exp(-elapsedSec / (expectedSec * CREEP_TAU)))
}

/** What the document is doing right now, from what the server reported. */
export function readingPhase(document) {
  const status = document?.status
  if (status === 'failed') return 'failed'
  if (status === 'extracted' || status === 'reviewed') return 'done'
  if (status !== 'queued' && status !== 'processing') return 'draft'
  if (document.stage === 'vision') return 'vision'
  if (document.stage === 'seals') return 'seals'
  const pages = document?.pages || []
  const done = pages.filter((p) => p.status === 'done').length
  if (pages.length > 0 && done === pages.length) return 'assembling'
  const started = pages.some((p) => p.status === 'processing' || p.status === 'done')
  return status === 'queued' && !started ? 'queued' : 'reading'
}

// Las etapas en las que todavía está trabajando.
const LIVE_PHASES = new Set(['queued', 'reading', 'seals', 'vision', 'assembling'])

export function isLive(phase) {
  return LIVE_PHASES.has(phase)
}

export function pagesDone(document) {
  return (document?.pages || []).filter((p) => p.status === 'done').length
}

export function finishedDuration(document) {
  if (!document || document.reviewed_at) return null
  if (document.status !== 'extracted' && document.status !== 'failed') return null
  const started = Date.parse(document.analyzed_at || '')
  const ended = Date.parse(document.updated_at || '')
  if (!Number.isFinite(started) || !Number.isFinite(ended) || ended < started) return null
  return (ended - started) / 1000
}

/**
 * The whole progress model for one document.
 *
 * @param document the document as the server sends it
 * @param timing   seconds since the analysis started, seconds in the current
 *                 stage, and the measured average per photo (see readingStats)
 */
export function readingProgress(document, timing = {}) {
  const { elapsedSec = 0, stepElapsedSec = 0, perPageSec = 25, queueWaitSec = 10 } = timing
  const phase = readingPhase(document)
  const total = document?.pages?.length || 0
  const done = pagesDone(document)
  const slice = total > 0 ? READ_BAND / total : READ_BAND

  let percent = 0
  let etaSec = null
  if (phase === 'queued') {
    percent = creep(QUEUE_BAND, stepElapsedSec, queueWaitSec)
    etaSec = Math.max(queueWaitSec - stepElapsedSec, 2) + total * perPageSec + ASSEMBLE_SECONDS
  } else if (phase === 'reading') {
    percent = QUEUE_BAND + done * slice + creep(slice, stepElapsedSec, perPageSec)
    const current = Math.max(perPageSec - stepElapsedSec, 1)
    etaSec = current + Math.max(total - done - 1, 0) * perPageSec + ASSEMBLE_SECONDS
  } else if (phase === 'assembling') {
    percent = READING_TOP + creep(ASSEMBLE_BAND, stepElapsedSec, ASSEMBLE_SECONDS)
    etaSec = Math.max(ASSEMBLE_SECONDS - stepElapsedSec, 1)
  } else if (phase === 'seals') {
    percent = SEALS_START + creep(SEALS_BAND, stepElapsedSec, SEALS_SECONDS)
    etaSec = Math.max(SEALS_SECONDS - stepElapsedSec, 1) + VISION_SECONDS
  } else if (phase === 'vision') {
    // La pasada más larga de todas: el modelo mira cada foto entre veinte y treinta segundos.
    percent = VISION_START + creep(VISION_BAND, stepElapsedSec, VISION_SECONDS)
    etaSec = Math.max(VISION_SECONDS - stepElapsedSec, 5)
  } else if (phase === 'done') {
    percent = 100
  }

  return {
    phase,
    percent,
    done,
    total,
    etaSec,
    elapsedSec,
    perPageSec,
    live: isLive(phase),
    // The photo being read now, 1-based, for "Leyendo la foto 2 de 3".
    currentPage: Math.min(done + 1, Math.max(total, 1)),
  }
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0))
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r ? `${m} min ${r} s` : `${m} min`
}

export function formatEta(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return 'Calculando…'
  if (seconds <= 12) return 'unos segundos'
  const step = seconds < 60 ? 5 : seconds < 600 ? 15 : 60
  return `≈ ${formatDuration(Math.ceil(seconds / step) * step)}`
}

/** The stage, as the architect sees it named in a badge. */
export const PHASE_META = {
  queued: { label: 'En cola', variant: 'warning' },
  reading: { label: 'Analizando', variant: 'accent' },
  seals: { label: 'Leyendo sellos', variant: 'accent' },
  vision: { label: 'Modelo de visión · qwen3-vl', variant: 'accent' },
  assembling: { label: 'Interpretando', variant: 'accent' },
  done: { label: 'Listo', variant: 'success' },
  failed: { label: 'Falló', variant: 'danger' },
  // The dialog opens the moment "Analizar" is pressed, before the server has answered that the document is in the queue.
  draft: { label: 'Enviando', variant: 'warning' },
}

/** What the document is doing, in one line. */
export function readingHeadline({ phase, currentPage, total }) {
  if (phase === 'draft') return 'Enviando el documento a la cola…'
  if (phase === 'queued') return 'En cola: esperando su turno en el servidor…'
  if (phase === 'reading') {
    return total > 1
      ? `Analizando la foto ${currentPage} de ${total} con OCR en el servidor…`
      : 'Analizando la foto con OCR en el servidor…'
  }
  if (phase === 'seals') return 'Buscando los sellos en las fotos y leyéndolos…'
  if (phase === 'vision') {
    return 'Mirando las fotos con qwen3-vl:4b en las computadoras de los arquitectos (20 a 30 s por foto)…'
  }
  if (phase === 'assembling') return 'Interpretando los datos leídos…'
  return ''
}

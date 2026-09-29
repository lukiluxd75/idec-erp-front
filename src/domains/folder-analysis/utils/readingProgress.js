import { ASSEMBLE_SECONDS } from '@/domains/folder-analysis/utils/readingStats'

/**
 * How far along a document's analysis is. The server only reports which photo it
 * already finished, so a bar moved by that alone would sit still for twenty
 * seconds and then jump half the way. Each stage instead owns a band of the bar:
 * what the server confirms moves the bar to the start of the next band, and
 * inside the band it creeps with the clock towards -- never past -- the next
 * confirmed point, so it always advances and never has to go backwards.
 */
const QUEUE_BAND = 8 // 0 -> 8   waiting for its turn
const READ_BAND = 84 // 8 -> 92  one slice per photo
const ASSEMBLE_BAND = 6 // 92 -> 98  putting the data together
const READING_TOP = QUEUE_BAND + READ_BAND

// The creep covers its band in about this many time constants, so a photo that
// takes longer than the average slows down instead of stalling at the ceiling.
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
  const pages = document?.pages || []
  const done = pages.filter((p) => p.status === 'done').length
  if (pages.length > 0 && done === pages.length) return 'assembling'
  // "queued" until a photo actually starts: the architect should be able to tell
  // "nobody has picked it up yet" from "it is being read right now".
  const started = pages.some((p) => p.status === 'processing' || p.status === 'done')
  return status === 'queued' && !started ? 'queued' : 'reading'
}

export function pagesDone(document) {
  return (document?.pages || []).filter((p) => p.status === 'done').length
}

/**
 * How long a run that already ended took, from the server's own two marks: the
 * start of the analysis and the last thing written about it. The screen's clock
 * would keep counting while the finished document is polled, and "tardó 40 s" is
 * the number worth keeping.
 */
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
    live: phase === 'queued' || phase === 'reading' || phase === 'assembling',
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

/**
 * An estimate read as an estimate: rounded to the precision it deserves, so it
 * does not tick down second by second as if it were a countdown.
 */
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
  assembling: { label: 'Interpretando', variant: 'accent' },
  done: { label: 'Listo', variant: 'success' },
  failed: { label: 'Falló', variant: 'danger' },
  // The dialog opens the moment "Analizar" is pressed, before the server has
  // answered that the document is in the queue.
  draft: { label: 'Enviando', variant: 'warning' },
}

/**
 * What the document is doing, in one line. The three lanes are read on the
 * server now (OCR + OpenCV), so the wait is always the server's own queue.
 */
export function readingHeadline({ phase, currentPage, total }) {
  if (phase === 'draft') return 'Enviando el documento a la cola…'
  if (phase === 'queued') return 'En cola: esperando su turno en el servidor…'
  if (phase === 'reading') {
    return total > 1
      ? `Analizando la foto ${currentPage} de ${total} con OCR en el servidor…`
      : 'Analizando la foto con OCR en el servidor…'
  }
  if (phase === 'assembling') return 'Interpretando los datos leídos…'
  return ''
}

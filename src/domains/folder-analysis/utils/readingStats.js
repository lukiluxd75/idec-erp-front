/** How long a reading usually takes, learned on this computer. */

const STORAGE_KEY = 'idec.folder-analysis.reading-stats.v1'

/** Seconds per photo before anything has been measured, per lane. */
const SEED_PER_PAGE = { folio: 22, tax_receipt: 14, plan: 35 }
const SEED_PER_PAGE_FALLBACK = 25

/** How long the document usually waits before its first photo starts. */
const QUEUE_WAIT = { folio: 3, tax_receipt: 3, plan: 4 }
const QUEUE_WAIT_FALLBACK = 10

/** Putting the data together after the last photo (page order, header). */
export const ASSEMBLE_SECONDS = 6

/** Buscar los sellos en las fotos y leerlos: OpenCV más un par de llamadas al OCR. */
export const SEALS_SECONDS = 8

/** La pasada del modelo de visión sobre las fotos. */
export const VISION_SECONDS = 30

const MIN_SAMPLE = 1
const MAX_SAMPLE = 20 * 60

const MAX_WEIGHT = 8
const MAX_RECORDED_IDS = 60

function readState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (!parsed || typeof parsed !== 'object') return { perType: {}, recorded: [] }
    return { perType: parsed.perType || {}, recorded: Array.isArray(parsed.recorded) ? parsed.recorded : [] }
  } catch {
    // Private mode, blocked storage, corrupted value: the seeds still work.
    return { perType: {}, recorded: [] }
  }
}

function writeState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Nothing to do: the estimate is a comfort, never a requirement.
  }
}

/** Measured average for the lane, or its seed while there is nothing to go on. */
export function perPageEstimate(docType) {
  const seed = SEED_PER_PAGE[docType] ?? SEED_PER_PAGE_FALLBACK
  const entry = readState().perType[docType]
  if (!entry || !(entry.perPage > 0) || !(entry.samples > 0)) return { seconds: seed, samples: 0 }
  return { seconds: entry.perPage, samples: entry.samples }
}

export function queueWaitEstimate(docType) {
  return QUEUE_WAIT[docType] ?? QUEUE_WAIT_FALLBACK
}

/** Takes the time of a reading that just finished, from the two timestamps the server already sends. */
export function recordReading(document) {
  if (!document || document.status !== 'extracted' || document.reviewed_at) return
  const pages = document.pages?.length || 0
  const started = Date.parse(document.analyzed_at || '')
  const ended = Date.parse(document.updated_at || '')
  if (!pages || !Number.isFinite(started) || !Number.isFinite(ended)) return

  const perPage = (ended - started) / 1000 / pages
  if (!(perPage >= MIN_SAMPLE) || perPage > MAX_SAMPLE) return

  const key = `${document.id}:${document.analyzed_at}`
  const state = readState()
  if (state.recorded.includes(key)) return

  const entry = state.perType[document.doc_type]
  const weight = Math.min(entry?.samples || 0, MAX_WEIGHT)
  const average = entry?.perPage > 0 ? (entry.perPage * weight + perPage) / (weight + 1) : perPage
  writeState({
    perType: { ...state.perType, [document.doc_type]: { perPage: average, samples: (entry?.samples || 0) + 1 } },
    recorded: [key, ...state.recorded].slice(0, MAX_RECORDED_IDS),
  })
}

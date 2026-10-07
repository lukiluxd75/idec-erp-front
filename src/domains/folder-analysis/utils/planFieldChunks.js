const BREAK_BEFORE = [/\bPLANTA\b/gi, /\bLOTE\b/gi, /\bSUP\b/gi, /\+/g]
const BREAK_AFTER = [/\d+(?:[.,]\d+)?\s*m[2²]/gi]
const MARK = '\u0001'

export function chunkPlanNote(text) {
  let marked = text || ''
  for (const pattern of BREAK_BEFORE) {
    marked = marked.replace(pattern, (match) => `${MARK}${match}`)
  }
  for (const pattern of BREAK_AFTER) {
    marked = marked.replace(pattern, (match) => `${match}${MARK}`)
  }
  return marked
    .split(MARK)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
}

const SCALE_RE = /^\d+(?:[.,]\d+)?\s*[:.]\s*\d+(?:[.,]\d+)?$/
const AREA_RE = /\d+(?:[.,]\d+)?\s*m[2²]/i

/** What a chunk looks like it is, from the same handful of words that split it. */
export function categorizePlanChunk(chunk) {
  const text = (chunk || '').trim()
  if (SCALE_RE.test(text)) return 'scale'
  if (AREA_RE.test(text)) return 'area'
  if (/^PLANTA\b/i.test(text)) return 'planta'
  if (/^LOTE\b/i.test(text)) return 'lote'
  if (/^\+/.test(text)) return 'room'
  return 'other'
}

/** An area chunk ("SUP 106.34m2") on its own, as "106.34 m²" for a stat tile. */
export function formatArea(chunk) {
  const match = AREA_RE.exec(chunk || '')
  if (!match) return chunk
  return match[0].replace(/\s*m[2²]/i, ' m²').replace(/^(\d)/, '$1')
}

const PLAN_FIELD_LABELS = {
  ESC: 'Escala',
  ESCALA: 'Escala',
  SUP: 'Superficie',
  'SUP.': 'Superficie',
  PLANTA: 'Planta',
  LOTE: 'Lote',
  PROPIETARIO: 'Propietario',
  'COD CAT': 'Código catastral',
  'COD. CAT': 'Código catastral',
  'COD.CAT': 'Código catastral',
  MANZANO: 'Manzana',
  MANZANA: 'Manzana',
}

export function planFieldLabel(name) {
  const key = (name || '').trim().toUpperCase().replace(/\.$/, '')
  return PLAN_FIELD_LABELS[key] || name
}

const LOTE_ID_RE = /LOTE\s*N?°?\s*([A-Z0-9-]+)/i

export function extractLoteId(text) {
  const match = LOTE_ID_RE.exec(text || '')
  return match ? match[1] : null
}

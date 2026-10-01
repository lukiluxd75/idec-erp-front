import { DOC_TYPES } from '@/domains/folder-analysis/utils/documentMeta'

/**
 * How a saved review is named and searched for. Shared by "Datos guardados" and
 * "Carpetas registradas" so the same document reads the same in both screens.
 */

/** The saved data of a document: what the reviewer confirmed, else the extraction. */
export function savedData(document) {
  return document?.reviewed_data || document?.data || {}
}

/**
 * The matrícula, wherever the extractor put it: a folio carries it at the top
 * level, a comprobante inside the property block, and a plano sometimes only in
 * a nested table row.
 */
export function findRegistrationNumber(value) {
  if (!value || typeof value !== 'object') return ''
  if (!Array.isArray(value) && value.registration_number) return String(value.registration_number)
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = findRegistrationNumber(item)
        if (found) return found
      }
    } else if (child && typeof child === 'object') {
      const found = findRegistrationNumber(child)
      if (found) return found
    }
  }
  return ''
}

/** Accent- and case-insensitive text, so "Ballivián" is found typing "ballivian". */
export function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]/g, '')
}

/**
 * The line that names a saved document in a list: whatever identifies it to the
 * architect (the plano's name, the matrícula, the receipt number), falling back
 * to the type when the extraction found none of them.
 */
export function savedDocumentTitle(document) {
  const data = savedData(document)
  const type = DOC_TYPES.find((item) => item.id === document?.doc_type)
  const registrationNumber = findRegistrationNumber(data)
  if (document?.doc_type === 'plan') {
    const planName = data.plan_name || data.name || data.title
    if (planName) return String(planName)
  }
  if (registrationNumber) return `Matrícula ${registrationNumber}`
  if (document?.doc_type === 'tax_receipt' && data.receipt_number) {
    return `Comprobante ${data.receipt_number}`
  }
  return type?.label || document?.doc_type || 'Documento'
}

/**
 * How long a saved review counts as "recién guardado". A day covers the whole
 * shift: the engineer who scanned carpetas all morning still finds them apart
 * from the pile in the afternoon.
 */
export const RECENT_SAVE_WINDOW_MS = 24 * 60 * 60 * 1000

/** Milliseconds of `reviewed_at`, or 0 when it is missing or unreadable. */
function savedAt(document) {
  const parsed = Date.parse(document?.reviewed_at || '')
  return Number.isFinite(parsed) ? parsed : 0
}

/** Saved within the last day — what the engineer just finished analyzing. */
export function isRecentlySaved(document, now = Date.now()) {
  const saved = savedAt(document)
  return saved > 0 && now - saved <= RECENT_SAVE_WINDOW_MS
}

/** Newest saved first, the order every list of reviews uses. */
export function bySavedAtDesc(a, b) {
  return savedAt(b) - savedAt(a)
}

/** Everything a document can be found by: its name, its id and its saved data. */
export function savedDocumentHaystack(document) {
  const data = savedData(document)
  return normalizeSearch(
    `${savedDocumentTitle(document)} ${findRegistrationNumber(data)} ${document?.id} ${JSON.stringify(data)}`
  )
}

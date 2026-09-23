/**
 * Helpers over the folio JSON produced by the backend (see
 * backend/app/domains/folios/application/use_cases/process_folio_use_case.py,
 * `_assemble`). Paths are dot/array paths like ['linderos', 'norte'] -- the same
 * keys the backend uses in `confianza` ('linderos.norte'), so a field knows if
 * it was read with low confidence.
 */

/** Statuses where the backend is still extracting (the page keeps polling). */
export const IN_PROGRESS = new Set(['pending', 'processing'])

export function getAt(obj, path) {
  return path.reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
}

/** Immutable set: returns a copy of `obj` with `value` at `path`. */
export function setAt(obj, path, value) {
  if (path.length === 0) return value
  const [key, ...rest] = path
  const base = obj ?? (typeof key === 'number' ? [] : {})
  const copy = Array.isArray(base) ? [...base] : { ...base }
  copy[key] = setAt(base[key], rest, value)
  return copy
}

export const pathKey = (path) => path.join('.')

export const EMPTY_PERSON = {
  nombre: '',
  rol: 'titular',
  estado_civil: null,
  ci: null,
  expedido: null,
  proporcion: null,
}

export function emptyAsiento(numero) {
  return {
    numero,
    personas: [{ ...EMPTY_PERSON }],
    acto: null,
    documento: { descripcion: '', fecha: null },
    autoridad: null,
    presentacion: { numero: null, fecha: null, hora: null },
    texto: '',
    confianza: null,
    agregado_manualmente: true,
  }
}

/**
 * People of the highest-numbered asiento listing titulares -- same rule as the
 * backend's current_owners(), recomputed on save so it follows the reviewer's
 * corrections.
 */
export function currentOwners(asientos = []) {
  const sorted = [...asientos].sort((a, b) => (b.numero ?? -1) - (a.numero ?? -1))
  for (const a of sorted) {
    const owners = (a.personas || []).filter((p) => p.rol === 'titular' && p.nombre)
    if (owners.length) {
      return owners.map((p) => ({ nombre: p.nombre, ci: p.ci, proporcion: p.proporcion, asiento: a.numero }))
    }
  }
  return []
}

/** What gets saved: the reviewer's data with derived fields refreshed. */
export function prepareForSave(data) {
  const asientos = data?.titularidad_dominio?.asientos || []
  return setAt(data, ['titularidad_dominio', 'titulares_actuales'], currentOwners(asientos))
}

/** Parse "280.00" / "280,50" typed by the reviewer; empty -> null. */
export function parseNumber(text) {
  if (text === '' || text == null) return null
  const n = Number(String(text).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function formatDateTime(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

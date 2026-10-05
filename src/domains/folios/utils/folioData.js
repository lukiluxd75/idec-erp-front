
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

const NOT_COMPARED = new Set(['version', 'confianza', 'campos_baja_confianza', 'observaciones', 'texto'])

/** { 'linderos.norte': 'CON ...', 'titularidad_dominio.asientos.1.personas.0.ci': '123', ... */
function flattenLeaves(value, prefix = '', out = {}) {
  if (value !== null && typeof value === 'object') {
    const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v]) : Object.entries(value)
    if (entries.length === 0) out[prefix] = value
    for (const [key, v] of entries) {
      if (NOT_COMPARED.has(key)) continue
      flattenLeaves(v, prefix ? `${prefix}.${key}` : key, out)
    }
  } else if (prefix) {
    out[prefix] = value ?? null
  }
  return out
}

/** Field-by-field differences between what was detected and what is on screen. */
export function compareFill(extracted, current) {
  const before = flattenLeaves(extracted || {})
  const after = flattenLeaves(current || {})
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
  const corregidos = []
  for (const key of keys) {
    const detectado = key in before ? before[key] : null
    const revisado = key in after ? after[key] : null
    if (JSON.stringify(detectado) !== JSON.stringify(revisado)) corregidos.push({ campo: key, detectado, revisado })
  }
  return { campos: keys.length, sin_cambios: keys.length - corregidos.length, corregidos }
}

export function buildFillReport(folio, fillLog, draft) {
  const current = draft ? prepareForSave(draft) : null
  const hasLog = fillLog && Object.keys(fillLog).length > 0
  return {
    folio: {
      id: folio.id,
      matricula: folio.matricula,
      estado: folio.status,
      fotos: folio.page_count,
      escaneado: folio.created_at,
      procesado: folio.processed_at,
    },
    generado: new Date().toISOString(),
    comparacion: compareFill(folio.extracted_data, current),
    llenado: hasLog ? fillLog : null,
    ...(hasLog ? {} : { aviso: 'El folio se procesó antes de que existiera el log de llenado: reprocéselo para tenerlo.' }),
    datos_detectados: folio.extracted_data,
    datos_en_pantalla: current,
  }
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

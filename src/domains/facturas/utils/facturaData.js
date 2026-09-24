/**
 * Helpers over the receipt JSON produced by the backend (see
 * backend/app/domains/facturas/application/use_cases/process_factura_use_case.py):
 * { campos: {key: value}, confianza: {key: 0..1}, campos_baja_confianza: [key],
 *   verificaciones: [...], observaciones: [...] }.
 */

/** Statuses where the backend is still extracting (the page keeps polling). */
export const IN_PROGRESS = new Set(['pending', 'processing'])

export const AMOUNT_KEYS = [
  'impuesto_determinado',
  'exencion',
  'descuento_10',
  'descuento_app_5',
  'importe_a_pagar',
  'monto_pagado',
  'saldo_gestion',
]

const TOLERANCE = 1 // Bs; the receipt rounds to whole bolivianos

function num(campos, key) {
  const v = campos?.[key]
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const fmt = (x) => String(Math.round(x * 100) / 100)

/**
 * Same rules as the backend's check_amounts(), recomputed live while the
 * reviewer edits: a misread digit almost always breaks one of them.
 */
export function checkAmounts(campos) {
  const n = Object.fromEntries(AMOUNT_KEYS.map((k) => [k, num(campos, k)]))
  const rules = []

  let keys = ['impuesto_determinado', 'exencion', 'descuento_10', 'descuento_app_5', 'importe_a_pagar']
  if (keys.every((k) => n[k] !== null)) {
    const expected = n.impuesto_determinado - n.exencion - n.descuento_10 - n.descuento_app_5
    rules.push({
      regla: 'Importe a pagar = impuesto − exención − descuento 10% − descuento app 5%',
      ok: Math.abs(expected - n.importe_a_pagar) <= TOLERANCE,
      detalle: `${fmt(n.impuesto_determinado)} − ${fmt(n.exencion)} − ${fmt(n.descuento_10)} − ${fmt(
        n.descuento_app_5
      )} = ${fmt(expected)}; el comprobante dice ${fmt(n.importe_a_pagar)}`,
      campos: keys,
    })
  }

  keys = ['importe_a_pagar', 'monto_pagado', 'saldo_gestion']
  if (keys.every((k) => n[k] !== null)) {
    const expected = n.importe_a_pagar - n.monto_pagado
    rules.push({
      regla: 'Saldo gestión = importe a pagar − monto pagado',
      ok: Math.abs(expected - n.saldo_gestion) <= TOLERANCE,
      detalle: `${fmt(n.importe_a_pagar)} − ${fmt(n.monto_pagado)} = ${fmt(expected)}; el comprobante dice ${fmt(
        n.saldo_gestion
      )}`,
      campos: keys,
    })
  }

  for (const [key, pct, label] of [
    ['descuento_10', 0.1, '10%'],
    ['descuento_app_5', 0.05, '5%'],
  ]) {
    if (n.impuesto_determinado === null || n[key] === null || n[key] === 0) continue
    const base = n.impuesto_determinado - (n.exencion ?? 0)
    const expected = base * pct
    rules.push({
      regla: `Descuento ${label} = ${label} del impuesto (menos exención)`,
      ok: Math.abs(expected - n[key]) <= TOLERANCE,
      detalle: `${label} de ${fmt(base)} = ${fmt(expected)}; el comprobante dice ${fmt(n[key])}`,
      campos: ['impuesto_determinado', key],
    })
  }
  return rules
}

/** What gets saved: the reviewer's data with the checks refreshed. */
export function prepareForSave(data) {
  return { ...data, verificaciones: checkAmounts(data?.campos) }
}

/** Field-by-field differences between what was detected and what is on screen. */
export function compareFill(extracted, current) {
  const before = extracted?.campos || {}
  const after = current?.campos || {}
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
  const corregidos = keys
    .filter((k) => (before[k] ?? null) !== (after[k] ?? null))
    .map((k) => ({
      campo: k,
      detectado: before[k] ?? null,
      revisado: after[k] ?? null,
      confianza: extracted?.confianza?.[k] ?? null,
      estaba_en_rojo: (extracted?.campos_baja_confianza || []).includes(k),
    }))
  return { campos: keys.length, sin_cambios: keys.length - corregidos.length, corregidos }
}

/**
 * Everything needed to judge a fill in one file: the backend's fill log
 * (every OCR reading of every field) plus the comparison against the data on
 * screen -- unsaved edits included, so the reviewer can correct and download
 * right away.
 */
export function buildFillReport(factura, fillLog, draft) {
  const current = draft ? prepareForSave(draft) : null
  const hasLog = fillLog && Object.keys(fillLog).length > 0
  return {
    factura: {
      id: factura.id,
      numero_comprobante: factura.numero_comprobante,
      estado: factura.status,
      escaneada: factura.created_at,
      procesada: factura.processed_at,
    },
    generado: new Date().toISOString(),
    comparacion: compareFill(factura.extracted_data, current),
    llenado: hasLog ? fillLog : null,
    ...(hasLog ? {} : { aviso: 'La factura no tiene log de llenado todavía: reprocésela para tenerlo.' }),
    datos_detectados: factura.extracted_data,
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

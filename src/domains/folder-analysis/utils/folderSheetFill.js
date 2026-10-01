import { sheetFields } from '@/domains/folder-analysis/utils/catalog'
import { bySavedAtDesc, savedData } from '@/domains/folder-analysis/utils/savedDocuments'

/**
 * Lo que los documentos ya revisados de una carpeta pueden poner en su hoja.
 *
 * El catálogo guarda lo que se le saca a un documento con la misma clave que usa
 * la hoja de la carpeta (`frontage`, `notary_number`…), así que traer un dato no
 * es adivinarlo: es la clave que el back ya declaró para ese par (carpeta,
 * documento). Lo que se lee es lo que el arquitecto confirmó en la revisión, no
 * la extracción cruda, porque la revisión es la que corrige a la lectura.
 *
 * Nada se escribe solo: esto solo dice qué hay disponible y de qué documento
 * sale. Aplicarlo es decisión de la pantalla.
 */

/** Un valor sirve para la hoja si se leyó algo: 0 vale, "" y null no. */
function usable(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'object') return false
  return String(value).trim() !== ''
}

/**
 * Qué claves de la hoja puede llenar un documento de este tipo. El catálogo lo
 * declara por dos lados y los dos cuentan: `document_values` (lo que se le saca
 * al documento dentro de esta carpeta) y el propio campo, cuando dice de qué
 * documento sale.
 */
function keysFedBy(folderType, docType) {
  const declared = (folderType?.document_values?.[docType] || []).map((value) => value.key)
  const byField = sheetFields(folderType)
    .filter((field) => field.source === 'document' && field.from_document === docType)
    .map((field) => field.key)
  return new Set([...declared, ...byField])
}

/**
 * Clave de la hoja -> { value, document } con lo que los documentos traen.
 *
 * @param {object} folderType el tipo de carpeta, del catálogo
 * @param {object[]} documents los documentos revisados que tiene la carpeta
 */
export function sheetSuggestions(folderType, documents = []) {
  if (!folderType) return {}
  const fields = sheetFields(folderType).filter((field) => field.source !== 'fixed')
  const suggestions = {}
  // Del más viejo al más nuevo, pisando: si dos documentos traen la misma clave
  // gana el revisado último, que es el que corrige al anterior.
  for (const document of [...documents].sort(bySavedAtDesc).reverse()) {
    const keys = keysFedBy(folderType, document.doc_type)
    if (keys.size === 0) continue
    const data = savedData(document)
    for (const field of fields) {
      if (!keys.has(field.key)) continue
      const value = data?.values?.[field.key] ?? data?.[field.key]
      if (!usable(value)) continue
      suggestions[field.key] = { value: String(value).trim(), document }
    }
  }
  return suggestions
}

/** Si la hoja ya dice lo mismo que el documento, no hay nada que traer. */
export function alreadyMatches(sheetValue, suggestion) {
  return String(sheetValue ?? '').trim() === suggestion.value
}

/**
 * Lo que se puede traer sin pisar nada escrito: los campos vacíos que algún
 * documento sabe llenar. Es lo que aplica el botón de "traer todo".
 */
export function pendingFills(sheet, suggestions) {
  return Object.entries(suggestions).filter(([key]) => !usable(sheet?.[key]))
}

/**
 * Los campos donde la hoja y el documento no dicen lo mismo. No se tocan solos:
 * puede ser que el arquitecto haya corregido a mano lo que la lectura sacó mal.
 */
export function conflictingFills(sheet, suggestions) {
  return Object.entries(suggestions).filter(
    ([key, suggestion]) => usable(sheet?.[key]) && !alreadyMatches(sheet[key], suggestion)
  )
}

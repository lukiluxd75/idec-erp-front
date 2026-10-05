import { sheetFields } from '@/domains/folder-analysis/utils/catalog'
import { bySavedAtDesc, savedData } from '@/domains/folder-analysis/utils/savedDocuments'

/** Lo que los documentos ya revisados de una carpeta pueden poner en su hoja. */

/** Un valor sirve para la hoja si se leyó algo: 0 vale, "" y null no. */
function usable(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'object') return false
  return String(value).trim() !== ''
}

/** Qué claves de la hoja puede llenar un documento de este tipo. */
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

/** Lo que se puede traer sin pisar nada escrito: los campos vacíos que algún documento sabe llenar. */
export function pendingFills(sheet, suggestions) {
  return Object.entries(suggestions).filter(([key]) => !usable(sheet?.[key]))
}

/** Los campos donde la hoja y el documento no dicen lo mismo. */
export function conflictingFills(sheet, suggestions) {
  return Object.entries(suggestions).filter(
    ([key, suggestion]) => usable(sheet?.[key]) && !alreadyMatches(sheet[key], suggestion)
  )
}

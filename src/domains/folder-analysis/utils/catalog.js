import { useEffect, useState } from 'react'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'

/** El catálogo del módulo: qué tipos de carpeta existen, qué documentos lleva cada uno y qué campos tiene su hoja propia. */
let pending = null

function load() {
  if (!pending) {
    pending = folderAnalysisApi.catalog().catch((error) => {
      // Un fallo no deja la promesa envenenada para siempre: la próxima pantalla que lo necesite vuelve a pedirlo.
      pending = null
      throw error
    })
  }
  return pending
}

/** Vuelve a pedirlo la próxima vez (tras un error, o al recargar a mano). */
export function forgetCatalog() {
  pending = null
}

export function useCatalog() {
  const [catalog, setCatalog] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    load()
      .then((value) => alive && setCatalog(value))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [])

  return { catalog, error, loading: !catalog && !error }
}

/** El tipo de carpeta pedido, o null mientras el catálogo no llegó. */
export function folderTypeOf(catalog, key) {
  if (!catalog) return null
  return catalog.folder_types.find((type) => type.key === key) || null
}

/** Los campos de la hoja de una carpeta, en una sola lista (sin sus grupos). */
export function sheetFields(folderType) {
  return (folderType?.field_groups || []).flatMap((group) => group.fields)
}

export function sheetForm(folderType, data) {
  const saved = data || {}
  return Object.fromEntries(
    sheetFields(folderType).map((field) => [
      field.key,
      field.source === 'fixed' ? field.value : (saved[field.key] ?? null),
    ])
  )
}

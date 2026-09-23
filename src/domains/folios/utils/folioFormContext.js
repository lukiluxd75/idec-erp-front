import { createContext, useContext } from 'react'

import { pathKey } from '@/domains/folios/utils/folioData'

/**
 * Shared state for every editable field of the folio: the data being reviewed,
 * how to change it, which paths the backend read with low confidence (red until
 * the reviewer touches them) and whether editing is allowed (confirmed folios
 * are read-only). Provided by FolioDetailPage.
 */
export const FolioFormContext = createContext(null)

export function useFolioForm() {
  return useContext(FolioFormContext)
}

/** Is this path (or its parent asiento) flagged and not yet touched? */
export function useIsLow(path, flagPath = path) {
  const { lowSet, touched } = useFolioForm()
  const key = pathKey(flagPath)
  return lowSet.has(key) && !touched.has(key)
}

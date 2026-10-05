import { createContext, useContext } from 'react'

import { pathKey } from '@/domains/folios/utils/folioData'

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

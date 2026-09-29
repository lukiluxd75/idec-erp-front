import { ENTRY_FIELDS, OWNER_FIELDS } from '@/domains/folder-analysis/utils/documentMeta'

export const emptyOwner = () => Object.fromEntries(OWNER_FIELDS.map(([key]) => [key, null]))

export const emptyEntry = () => ({
  entry_number: null,
  owners: [emptyOwner()],
  ...Object.fromEntries(ENTRY_FIELDS.map(([key]) => [key, null])),
})

/** Fills in the nested objects/lists the folio form relies on (partial results). */
export function withFolioDefaults(data) {
  const value = data || {}
  return {
    ...value,
    boundaries: { north: null, south: null, east: null, west: null, ...(value.boundaries || {}) },
    ownership_entries: (value.ownership_entries || []).map((entry) => ({
      ...emptyEntry(),
      ...entry,
      owners: (entry.owners || []).length ? entry.owners : [emptyOwner()],
    })),
  }
}

export function withTaxReceiptDefaults(data) {
  const value = data || {}
  return { ...value, taxpayer: { type: null, id_number: null, name: null, ...(value.taxpayer || {}) } }
}

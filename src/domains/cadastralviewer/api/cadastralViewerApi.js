import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ENV } from '@/core/config/env.config'
import { httpClient } from '@/core/http/httpClient'

const endpoints = API_ENDPOINTS.CADASTRAL_VIEWER

function normalizeSearchText(value) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es')
}

function uniqueStreetResults(features) {
  return [...new Map(
    features.map((feature) => [
      normalizeSearchText(`${feature.title} ${feature.subtitle || ''}`),
      feature,
    ]),
  ).values()]
}

export const cadastralViewerApi = {
  listProcedures: (admin = false) => httpClient.get(admin ? endpoints.ADMIN_PROCEDURES : endpoints.PROCEDURES, { requiresAuth: admin }),
  saveProcedure: (payload, id) => id
    ? httpClient.put(endpoints.PROCEDURE(id), payload)
    : httpClient.post(endpoints.PROCEDURES, payload),
  deleteProcedure: (id) => httpClient.delete(endpoints.PROCEDURE(id)),

  listLayers: (admin = false) => httpClient.get(admin ? endpoints.ADMIN_LAYERS : endpoints.LAYERS, { requiresAuth: admin }),
  searchMapFeatures: async (kind, query) => {
    const search = (term) => httpClient.get(
      `${endpoints.SEARCH}?kind=${encodeURIComponent(kind)}&q=${encodeURIComponent(term)}`,
      { requiresAuth: false },
    )
    if (kind !== 'street') return search(query)

    const originalResults = await search(query)
    if (originalResults.length > 0) return uniqueStreetResults(originalResults)

    const normalizedQuery = normalizeSearchText(query)
    if (normalizedQuery !== query) {
      const normalizedResults = await search(normalizedQuery)
      if (normalizedResults.length > 0) return uniqueStreetResults(normalizedResults)
    }

    const queryWords = normalizedQuery.split(' ').filter((word) => word.length >= 2)
    const target = [...queryWords].sort((first, second) => second.length - first.length)[0]
    if (!target) return originalResults

    for (const length of [4, 3, 2]) {
      if (length >= target.length) continue
      const probes = [...new Set(
        Array.from({ length: target.length - length + 1 }, (_, index) =>
          target.slice(index, index + length)),
      )]
      const candidateGroups = await Promise.all(probes.map(search))
      const candidates = [...new Map(
        candidateGroups.flat().map((feature) => [`${feature.kind}-${feature.id}`, feature]),
      ).values()]
      const matches = candidates.filter((feature) => {
        const searchableText = normalizeSearchText(`${feature.title} ${feature.subtitle || ''}`)
        return queryWords.every((word) => searchableText.includes(word))
      })
      if (matches.length > 0) return uniqueStreetResults(matches)
    }

    return []
  },
  saveLayer: (payload, id) => id
    ? httpClient.put(endpoints.LAYER(id), payload)
    : httpClient.post(endpoints.LAYERS, payload),
  deleteLayer: (id) => httpClient.delete(endpoints.LAYER(id)),

  listAdvertisements: (admin = false) => httpClient.get(admin ? endpoints.ADMIN_ADVERTISEMENTS : endpoints.ADVERTISEMENTS, { requiresAuth: admin }),
  uploadAdvertisement: (formData) => httpClient.post(endpoints.UPLOAD_ADVERTISEMENT, formData),
  updateAdvertisement: (id, payload) => httpClient.put(endpoints.ADVERTISEMENT(id), payload),
  deleteAdvertisement: (id) => httpClient.delete(endpoints.ADVERTISEMENT(id)),
}

export function getAdvertisementUrl(advertisement) {
  const source = advertisement?.source_url || advertisement?.download_url
  if (!source) return ''
  if (/^https?:\/\//i.test(source)) return source
  return `${ENV.API_BASE_URL}${source}`
}
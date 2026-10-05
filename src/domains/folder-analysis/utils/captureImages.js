import { useEffect, useState } from 'react'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'

/** The photos of the module, downloaded once each. */
const cache = new Map()

function entryKey(captureId, variant, folderId) {
  return `${captureId}|${variant}|${folderId || ''}`
}

function loadUrl(captureId, variant, folderId) {
  const key = entryKey(captureId, variant, folderId)
  if (!cache.has(key)) {
    const promise = folderAnalysisApi
      .captureBlob(captureId, variant, folderId)
      .then((blob) => URL.createObjectURL(blob))
      .catch((error) => {
        cache.delete(key)
        throw error
      })
    cache.set(key, promise)
  }
  return cache.get(key)
}

export function prefetchCapture(captureId, variant = 'preview', folderId = null) {
  if (captureId) loadUrl(captureId, variant, folderId).catch(() => {})
}

/** The blob URL of one copy of a photo, and whether it is still on its way. */
export function useCaptureUrl(captureId, variant = 'preview', folderId = null) {
  const [state, setState] = useState({ key: null, url: null, failed: false })
  const key = entryKey(captureId, variant, folderId)

  useEffect(() => {
    if (!captureId) return undefined
    let alive = true
    loadUrl(captureId, variant, folderId)
      .then((url) => alive && setState({ key, url, failed: false }))
      .catch(() => alive && setState({ key, url: null, failed: true }))
    return () => {
      alive = false
    }
  }, [captureId, variant, folderId, key])

  const ready = state.key === key
  return { url: ready && !state.failed ? state.url : null, loading: !ready, failed: ready && state.failed }
}

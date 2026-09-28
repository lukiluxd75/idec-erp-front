import { useEffect, useState } from 'react'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'

/**
 * The photos of the module, downloaded once each.
 *
 * They need the Bearer token, so they cannot be a plain <img src> and travel as
 * blobs. A photo never changes once it is uploaded: the blob URL is kept for the
 * session (the board re-renders every few seconds while polling) and the server
 * sends it with a long cache, so a reload does not download it again either.
 */
const cache = new Map()

function entryKey(captureId, variant) {
  return `${captureId}|${variant}`
}

function loadUrl(captureId, variant) {
  const key = entryKey(captureId, variant)
  if (!cache.has(key)) {
    const promise = folderAnalysisApi
      .captureBlob(captureId, variant)
      .then((blob) => URL.createObjectURL(blob))
      .catch((error) => {
        cache.delete(key)
        throw error
      })
    cache.set(key, promise)
  }
  return cache.get(key)
}

/**
 * Starts a download now so the photo is already there when it is shown -- the
 * other pages of the document being reviewed, the photo under the pointer.
 */
export function prefetchCapture(captureId, variant = 'preview') {
  if (captureId) loadUrl(captureId, variant).catch(() => {})
}

/** The blob URL of one copy of a photo, and whether it is still on its way. */
export function useCaptureUrl(captureId, variant = 'preview') {
  const [state, setState] = useState({ key: null, url: null, failed: false })
  const key = entryKey(captureId, variant)

  useEffect(() => {
    if (!captureId) return undefined
    let alive = true
    loadUrl(captureId, variant)
      .then((url) => alive && setState({ key, url, failed: false }))
      .catch(() => alive && setState({ key, url: null, failed: true }))
    return () => {
      alive = false
    }
  }, [captureId, variant, key])

  const ready = state.key === key
  return { url: ready && !state.failed ? state.url : null, loading: !ready, failed: ready && state.failed }
}

import { ImageOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'
import { Spinner } from '@/shared/ui'
import { cn } from '@/shared/utils'

// Photos never change once uploaded, so each blob URL is downloaded once per session
// (the screen re-renders every few seconds while polling).
const cache = new Map()

function loadUrl(captureId, thumbnail) {
  const key = `${captureId}|${thumbnail}`
  if (!cache.has(key)) {
    const promise = folderAnalysisApi
      .captureBlob(captureId, thumbnail)
      .then((blob) => URL.createObjectURL(blob))
      .catch((error) => {
        cache.delete(key)
        throw error
      })
    cache.set(key, promise)
  }
  return cache.get(key)
}

/** A capture's photo or thumbnail (needs the Bearer token, so it is fetched as a Blob). */
export function CaptureImage({ captureId, thumbnail = true, alt = 'Foto', className = '', onClick }) {
  const [state, setState] = useState({ key: null, url: null, failed: false })
  const key = `${captureId}|${thumbnail}`

  useEffect(() => {
    let alive = true
    loadUrl(captureId, thumbnail)
      .then((url) => alive && setState({ key, url, failed: false }))
      .catch(() => alive && setState({ key, url: null, failed: true }))
    return () => {
      alive = false
    }
  }, [captureId, thumbnail, key])

  if (state.key !== key) {
    return (
      <div className={cn('flex items-center justify-center bg-slate-100', className)}>
        <Spinner className="h-4 w-4" />
      </div>
    )
  }
  if (state.failed) {
    return (
      <div className={cn('flex items-center justify-center bg-slate-100 text-slate-400', className)}>
        <ImageOff className="h-4 w-4" />
      </div>
    )
  }
  return <img src={state.url} alt={alt} draggable={false} onClick={onClick} className={cn('object-cover', className)} />
}

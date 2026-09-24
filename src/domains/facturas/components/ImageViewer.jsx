import { ImageOff, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useState } from 'react'

import { facturasApi } from '@/domains/facturas/api/facturas.api'
import { Spinner } from '@/shared/ui'
import { cn } from '@/shared/utils'

/**
 * The receipt photo as the pipeline left it (straightened), or the original.
 * `version` changes when the receipt is reprocessed so the image is fetched
 * again.
 */
export function ImageViewer({ facturaId, version }) {
  // Result of the last download, tagged with what it was for: while the tag
  // does not match the current request the viewer is loading (derived, so the
  // effect never has to reset state synchronously).
  const [result, setResult] = useState({ key: null, url: null, error: null })
  const [zoom, setZoom] = useState(false)
  const [original, setOriginal] = useState(false)
  const requestKey = `${facturaId}|${version}|${original}`

  useEffect(() => {
    let alive = true
    let url = null
    facturasApi
      .imageBlob(facturaId, !original)
      .then((blob) => {
        url = URL.createObjectURL(blob)
        if (alive) setResult({ key: requestKey, url, error: null })
      })
      .catch((e) => {
        if (alive) setResult({ key: requestKey, url: null, error: e.message })
      })
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [facturaId, original, requestKey])

  const loading = result.key !== requestKey

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600">Foto de la factura</span>
        <span className="ml-auto" />
        <label className="flex items-center gap-1 text-xs text-slate-500">
          <input type="checkbox" checked={original} onChange={(e) => setOriginal(e.target.checked)} />
          Foto original
        </label>
        <button
          type="button"
          onClick={() => setZoom((z) => !z)}
          className="rounded-lg p-1.5 text-slate-600 hover:bg-white"
          title={zoom ? 'Ajustar al ancho' : 'Tamaño real'}
        >
          {zoom ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
        </button>
      </div>

      <div className="min-h-[320px] flex-1 overflow-auto rounded-2xl border border-slate-200/80 bg-slate-100/70">
        {loading ? (
          <div className="flex h-full items-center justify-center py-20">
            <Spinner className="h-6 w-6" />
          </div>
        ) : result.error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-20 text-sm text-slate-500">
            <ImageOff className="h-6 w-6" />
            {result.error}
          </div>
        ) : (
          <img
            src={result.url}
            alt="Factura"
            onClick={() => setZoom((z) => !z)}
            className={cn('block cursor-zoom-in', zoom ? 'max-w-none cursor-zoom-out' : 'w-full')}
          />
        )}
      </div>
    </div>
  )
}

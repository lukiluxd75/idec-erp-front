import { ImageOff, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useState } from 'react'

import { foliosApi } from '@/domains/folios/api/folios.api'
import { Spinner } from '@/shared/ui'
import { cn } from '@/shared/utils'

/**
 * Folio pages as the pipeline left them (rotated upright + deskewed), ordered
 * by the printed 'Pag X de N' when it was read. `version` changes when the
 * folio is reprocessed so the images are fetched again.
 */
export function PageViewer({ folioId, pages, version }) {
  // Result of the last download, tagged with what it was for: while the tag
  // does not match the current request the viewer is loading (derived, so the
  // effect never has to reset state synchronously).
  const [result, setResult] = useState({ key: null, images: [], error: null })
  const [current, setCurrent] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [original, setOriginal] = useState(false)

  // A refresh of the folio hands a new (equal) array: key on content so the
  // images are not downloaded again for nothing.
  const pagesKey = JSON.stringify(pages)
  const requestKey = `${folioId}|${pagesKey}|${version}|${original}`

  useEffect(() => {
    let alive = true
    const urls = []
    const ordered = JSON.parse(pagesKey).sort(
      (a, b) => (a.detected_page_number ?? 1000 + a.page_index) - (b.detected_page_number ?? 1000 + b.page_index)
    )
    Promise.all(
      ordered.map(async (p) => {
        const blob = await foliosApi.pageBlob(folioId, p.page_index, !original)
        const url = URL.createObjectURL(blob)
        urls.push(url)
        return {
          index: p.page_index,
          label: p.detected_page_number ? `Pág. ${p.detected_page_number}` : `Foto ${p.page_index + 1}`,
          url,
        }
      })
    )
      .then((imgs) => {
        if (alive) setResult({ key: requestKey, images: imgs, error: null })
      })
      .catch((e) => {
        if (alive) setResult({ key: requestKey, images: [], error: e.message })
      })
    return () => {
      alive = false
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [folioId, pagesKey, version, original, requestKey])

  const loading = result.key !== requestKey
  const { images, error } = result
  const img = images[Math.min(current, images.length - 1)]

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {images.map((it, i) => (
          <button
            key={it.index}
            type="button"
            onClick={() => setCurrent(i)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-semibold transition',
              i === current ? 'bg-brand-800 text-white' : 'bg-white/70 text-slate-600 hover:bg-white'
            )}
          >
            {it.label}
          </button>
        ))}
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
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-20 text-sm text-slate-500">
            <ImageOff className="h-6 w-6" />
            {error}
          </div>
        ) : img ? (
          <img
            src={img.url}
            alt={img.label}
            onClick={() => setZoom((z) => !z)}
            className={cn('block cursor-zoom-in', zoom ? 'max-w-none cursor-zoom-out' : 'w-full')}
          />
        ) : null}
      </div>
    </div>
  )
}

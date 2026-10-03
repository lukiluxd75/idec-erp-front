import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { CaptureViewer } from '@/domains/folder-analysis/components/CaptureViewer'
import { prefetchCapture } from '@/domains/folder-analysis/utils/captureImages'

/**
 * The photo at full screen, with the same zoom and turn controls as the review
 * screen. `items` is what can be paged through with the arrows (the pages of a
 * document, or the single photo that was clicked).
 *
 * @param items [{ captureId, label }]
 */
export function CaptureLightbox({ items = [], startAt = 0, onClose, folderId = null }) {
  const [current, setCurrent] = useState(startAt)
  const index = Math.min(Math.max(current, 0), Math.max(items.length - 1, 0))
  const item = items[index]

  // Its neighbours are downloaded while this one is being looked at, so paging
  // through the pages of a folio does not wait once per page.
  useEffect(() => {
    items.forEach((it) => prefetchCapture(it.captureId, 'preview', folderId))
  }, [items, folderId])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
      if (event.key === 'ArrowRight') setCurrent((i) => Math.min(i + 1, items.length - 1))
      if (event.key === 'ArrowLeft') setCurrent((i) => Math.max(i - 1, 0))
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [items.length, onClose])

  if (!item || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[10040] flex flex-col bg-slate-950/90 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={item.label || 'Foto'}
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-700/60 bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-2.5">
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{item.label || 'Foto'}</p>
          {items.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Anterior"
                disabled={index === 0}
                onClick={() => setCurrent(index - 1)}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold tabular-nums text-slate-500">
                {index + 1} / {items.length}
              </span>
              <button
                type="button"
                title="Siguiente"
                disabled={index === items.length - 1}
                onClick={() => setCurrent(index + 1)}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="min-h-0 flex-1 p-3">
          <CaptureViewer
            key={item.captureId}
            captureId={item.captureId}
            folderId={folderId}
            alt={item.label || 'Foto'}
            className="h-full"
          />
        </div>
      </div>
    </div>,
    document.body
  )
}

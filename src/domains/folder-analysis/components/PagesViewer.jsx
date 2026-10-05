import { useEffect, useState } from 'react'

import { CaptureLightbox } from '@/domains/folder-analysis/components/CaptureLightbox'
import { CaptureViewer } from '@/domains/folder-analysis/components/CaptureViewer'
import { prefetchCapture } from '@/domains/folder-analysis/utils/captureImages'
import { cn } from '@/shared/utils'

/** The document's original photos, one tab per page, to compare against the form. */
export function PagesViewer({ pages, current, onChange, folderId = null }) {
  const [expanded, setExpanded] = useState(false)
  const index = Math.min(current, Math.max(pages.length - 1, 0))
  const page = pages[index]

  useEffect(() => {
    pages.forEach((p) => prefetchCapture(p.capture_id, 'preview', folderId))
  }, [pages, folderId])

  const items = pages.map((p, i) => ({ captureId: p.capture_id, label: `Página ${i + 1}` }))

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {pages.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {pages.map((p, i) => (
            <button
              key={p.capture_id}
              type="button"
              onClick={() => onChange(i)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                i === index ? 'bg-brand-800 text-white' : 'bg-white/70 text-slate-600 hover:bg-white'
              )}
            >
              Página {i + 1}
            </button>
          ))}
        </div>
      )}

      {page && (
        <CaptureViewer
          key={page.capture_id}
          captureId={page.capture_id}
          folderId={folderId}
          alt={`Página ${index + 1}`}
          className="min-h-0 flex-1"
          onExpand={() => setExpanded(true)}
        />
      )}

      {expanded && (
        <CaptureLightbox
          items={items}
          startAt={index}
          folderId={folderId}
          onClose={() => setExpanded(false)}
        />
      )}
    </div>
  )
}

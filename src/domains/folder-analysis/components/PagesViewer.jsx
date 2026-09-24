import { ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'

import { CaptureImage } from '@/domains/folder-analysis/components/CaptureImage'
import { cn } from '@/shared/utils'

/** The document's original photos, one tab per page, to compare against the form. */
export function PagesViewer({ pages }) {
  const [current, setCurrent] = useState(0)
  const [zoom, setZoom] = useState(false)
  const page = pages[Math.min(current, pages.length - 1)]

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {pages.map((p, i) => (
          <button
            key={p.capture_id}
            type="button"
            onClick={() => setCurrent(i)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-semibold transition',
              i === current ? 'bg-brand-800 text-white' : 'bg-white/70 text-slate-600 hover:bg-white'
            )}
          >
            Página {i + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setZoom((z) => !z)}
          className="ml-auto rounded-lg p-1.5 text-slate-600 hover:bg-white"
          title={zoom ? 'Ajustar al ancho' : 'Tamaño real'}
        >
          {zoom ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
        </button>
      </div>
      <div className="min-h-[320px] flex-1 overflow-auto rounded-2xl border border-slate-200/80 bg-slate-100/70">
        {page && (
          <CaptureImage
            key={page.capture_id}
            captureId={page.capture_id}
            thumbnail={false}
            alt={`Página ${current + 1}`}
            onClick={() => setZoom((z) => !z)}
            className={cn('block !object-contain', zoom ? 'max-w-none cursor-zoom-out' : 'w-full cursor-zoom-in')}
          />
        )}
      </div>
    </div>
  )
}

import { ArrowDownToLine, Layers } from 'lucide-react'
import { useState } from 'react'

import { DocumentCard } from '@/domains/folder-analysis/components/DocumentCard'
import { LANE_THEME } from '@/domains/folder-analysis/utils/documentMeta'
import { getDraggedCapture, isCaptureDrag } from '@/domains/folder-analysis/utils/dragData'
import { cn } from '@/shared/utils'

/**
 * Classification lane (Folio / Impuesto / Plano) with themed chrome and drop target.
 */
export function DocumentSection({ type, documents, busy, onCreate, ...cardHandlers }) {
  const [dragOver, setDragOver] = useState(false)
  const Icon = type.icon
  const theme = LANE_THEME[type.id] || LANE_THEME.folio

  return (
    <section
      role="region"
      aria-label={`Carril de clasificación: ${type.label}`}
      onDragOver={(e) => {
        if (!isCaptureDrag(e) || busy) return
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const captureId = getDraggedCapture(e)
        if (captureId && !busy) onCreate(type.id, captureId)
      }}
      className={cn('workbench-lane', theme.lane, dragOver && 'workbench-lane--active')}
    >
      <header className="workbench-lane__head sticky top-0 z-[1] bg-white/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
          <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">{type.label}</h3>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold tabular-nums text-slate-500">
            <Layers className="h-3 w-3" aria-hidden />
            {documents.length}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">{type.hint}</p>
      </header>

      <div className={cn('workbench-lane__drop', dragOver && 'flex items-center justify-center gap-2')}>
        <ArrowDownToLine className={cn('inline h-3.5 w-3.5 shrink-0', !dragOver && 'hidden')} aria-hidden />
        {dragOver ? 'Suelte para crear un documento nuevo' : 'Arrastre una foto aquí para abrir un documento'}
      </div>

      <div className="workbench-lane__body">
        {documents.length === 0 ? (
          <div className="workbench-lane__empty">
            <Icon className="h-8 w-8 text-slate-300" strokeWidth={1.25} aria-hidden />
            <p className="text-sm font-semibold text-slate-600">Sin documentos</p>
            <p className="max-w-[14rem] text-xs leading-relaxed text-slate-500">
              Los expedientes que clasifique en este carril aparecerán listados aquí.
            </p>
          </div>
        ) : (
          <ul className="workbench-lane__list" role="list">
            {documents.map((document) => (
              <li key={document.id}>
                <DocumentCard
                  document={document}
                  multiPage={type.multiPage}
                  busy={busy}
                  {...cardHandlers}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

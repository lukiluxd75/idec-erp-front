import { useState } from 'react'

import { DocumentCard } from '@/domains/folder-analysis/components/DocumentCard'
import { getDraggedCapture, isCaptureDrag } from '@/domains/folder-analysis/utils/dragData'
import { cn } from '@/shared/utils'

/**
 * One of the three sections (Folio, Impuesto, Plano). Dropping a photo on the
 * section starts a new document of that type; dropping it on a draft card adds a
 * page to that document instead.
 */
export function DocumentSection({ type, documents, busy, onCreate, ...cardHandlers }) {
  const [dragOver, setDragOver] = useState(false)
  const Icon = type.icon

  return (
    <section
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
      className={cn(
        'flex min-h-[18rem] flex-col gap-3 rounded-2xl border-2 border-dashed p-4 transition',
        dragOver ? 'border-accent-400 bg-accent-50/70' : 'border-slate-200 bg-white/50'
      )}
    >
      <header className="flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600 ring-1 ring-accent-200">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-800">{type.label}</h3>
          <p className="text-xs text-slate-500">{type.hint}</p>
        </div>
      </header>

      <p
        className={cn(
          'rounded-xl py-3 text-center text-xs font-medium transition',
          dragOver ? 'text-accent-600' : 'text-slate-400'
        )}
      >
        Suelte aquí una foto para crear un documento nuevo
      </p>

      <div className="flex flex-col gap-3">
        {documents.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            multiPage={type.multiPage}
            busy={busy}
            {...cardHandlers}
          />
        ))}
      </div>
    </section>
  )
}

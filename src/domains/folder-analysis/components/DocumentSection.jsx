import { ArrowDownToLine, Layers, Combine } from 'lucide-react'
import { useState } from 'react'

import { DocumentCard } from '@/domains/folder-analysis/components/DocumentCard'
import { LANE_THEME, NOT_READ } from '@/domains/folder-analysis/utils/documentMeta'
import { getDraggedCapture, isCaptureDrag } from '@/domains/folder-analysis/utils/dragData'
import { cn } from '@/shared/utils'

export function DocumentSection({ type, documents, busy, loose = 0, onCreate, onConsolidate, ...cardHandlers }) {
  const [dragOver, setDragOver] = useState(false)
  const Icon = type.icon
  const theme = LANE_THEME[type.id] || LANE_THEME.folio
  const gathers = documents.reduce((n, d) => n + (d.pages?.length || 0), 0) + loose
  const sources = documents.length + (loose > 0 ? 1 : 0)
  const canGather = NOT_READ.has(type.id) && onConsolidate && !busy && sources > 1

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
        <Icon className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
        <h3 className="shrink-0 text-sm font-bold text-slate-900">{type.label}</h3>
        {/* Vacío es un cero atenuado: "0 documentos" en cada carril era la misma palabra cuatro veces para decir que no hay nada. */}
        <span
          title={`${documents.length} ${documents.length === 1 ? 'documento' : 'documentos'}`}
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold tabular-nums',
            documents.length > 0 ? 'bg-accent-600/10 text-accent-800' : 'bg-slate-100 text-slate-400'
          )}
        >
          <Layers className="h-3 w-3" aria-hidden />
          {documents.length > 0
            ? `${documents.length} ${documents.length === 1 ? 'documento' : 'documentos'}`
            : '0'}
        </span>
        <p
          title={type.hint}
          className="hidden min-w-0 flex-1 truncate text-[11px] text-slate-500 sm:block"
        >
          {type.hint}
        </p>
        {canGather && (
          <button
            type="button"
            onClick={() => onConsolidate(type.id)}
            title={`Deja en un solo documento las ${gathers} fotos de este carril y de la bandeja`}
            className={cn('workbench-assign-btn shrink-0', theme?.assignBtn)}
          >
            <Combine className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">Juntar todo en uno ({gathers})</span>
          </button>
        )}
        {/* Con el carril vacío el destino ES la fila de abajo, así que tener los dos era decir lo mismo dos veces en cada carril. */}
        {(documents.length > 0 || dragOver) && (
          <div className={cn('workbench-lane__drop', dragOver && 'flex items-center gap-1.5')}>
            <ArrowDownToLine className={cn('inline h-3.5 w-3.5 shrink-0', !dragOver && 'hidden')} aria-hidden />
            {dragOver ? 'Suelte para crear un documento' : 'Suelte una foto aquí'}
          </div>
        )}
      </header>

      <div className="workbench-lane__body">
        {documents.length === 0 ? (
          // El vacío de un carril ES su destino: una sola fila dice que no hay nada y ofrece dónde soltar.
          <div className="workbench-lane__empty">
            <ArrowDownToLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {dragOver ? 'Suelte para crear un documento' : `Arrastre una foto aquí para crear ${type.noun}`}
          </div>
        ) : (
          <ul className="workbench-lane__list" role="list">
            {documents.map((document) => (
              <li key={document.id}>
                <DocumentCard
                  document={document}
                  multiPage={type.multiPage}
                  // A document still being created has no id of its own yet: it takes no pages and no analysis until the server names it.
                  busy={busy || Boolean(document.pending)}
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

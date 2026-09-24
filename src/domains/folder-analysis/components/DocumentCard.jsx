import { ChevronLeft, ChevronRight, FileSearch, Play, RotateCcw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { CaptureImage } from '@/domains/folder-analysis/components/CaptureImage'
import { DocumentStatusBadge } from '@/domains/folder-analysis/components/DocumentStatusBadge'
import { IN_PROGRESS, formatDateTime } from '@/domains/folder-analysis/utils/documentMeta'
import { getDraggedCapture, isCaptureDrag } from '@/domains/folder-analysis/utils/dragData'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/utils'

const PAGES_EDITABLE = new Set(['draft', 'failed'])
const HAS_DATA = new Set(['extracted', 'reviewed'])

/**
 * One document inside a section: its pages, status and actions. While it is a
 * draft (or failed) pages can be added by dropping photos on it, reordered or
 * removed; once analyzed its data is opened in the review screen.
 */
export function DocumentCard({ document, multiPage, busy, onAddPage, onSetPages, onAnalyze, onDelete }) {
  const [dragOver, setDragOver] = useState(false)
  const inProgress = IN_PROGRESS.has(document.status)
  const pagesEditable = PAGES_EDITABLE.has(document.status) && !busy
  const acceptsDrop = pagesEditable && multiPage
  const ids = document.pages.map((p) => p.capture_id)

  const move = (index, delta) => {
    const next = [...ids]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    onSetPages(document, next)
  }

  const remove = (index) => onSetPages(document, ids.filter((_, i) => i !== index))

  const dropHandlers = acceptsDrop
    ? {
        onDragOver: (e) => {
          if (!isCaptureDrag(e)) return
          e.preventDefault()
          e.stopPropagation()
          setDragOver(true)
        },
        onDragLeave: () => setDragOver(false),
        onDrop: (e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(false)
          const captureId = getDraggedCapture(e)
          if (captureId) onAddPage(document, captureId)
        },
      }
    : {}

  return (
    <article
      {...dropHandlers}
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-white p-3 shadow-xs transition',
        dragOver ? 'border-accent-400 ring-2 ring-accent-300/60' : 'border-slate-200'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-700">
            {document.pages.length} {document.pages.length === 1 ? 'página' : 'páginas'}
          </p>
          <p className="truncate text-[11px] text-slate-400">{formatDateTime(document.created_at)}</p>
        </div>
        <DocumentStatusBadge status={document.status} />
      </div>

      <ol className="flex gap-2 overflow-x-auto pb-1">
        {document.pages.map((page, index) => (
          <li key={page.capture_id} className="relative shrink-0">
            <CaptureImage captureId={page.capture_id} className="h-20 w-16 rounded-lg ring-1 ring-slate-200" />
            <span className="absolute bottom-1 left-1 rounded bg-slate-900/70 px-1 text-[10px] font-bold text-white">
              {index + 1}
            </span>
            {pagesEditable && (
              <div className="absolute inset-x-0 top-0 flex justify-between p-0.5">
                <div className="flex">
                  {index > 0 && (
                    <button type="button" title="Mover antes" onClick={() => move(index, -1)}
                      className="rounded bg-white/90 p-0.5 text-slate-600 hover:text-slate-900">
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                  )}
                  {index < ids.length - 1 && (
                    <button type="button" title="Mover después" onClick={() => move(index, 1)}
                      className="rounded bg-white/90 p-0.5 text-slate-600 hover:text-slate-900">
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {ids.length > 1 && (
                  <button type="button" title="Quitar página (vuelve a Fotos recibidas)" onClick={() => remove(index)}
                    className="rounded bg-white/90 p-0.5 text-slate-600 hover:text-state-danger">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
        {acceptsDrop && (
          <li className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 p-1 text-center text-[10px] leading-tight text-slate-400">
            Suelte aquí otra página
          </li>
        )}
      </ol>

      {inProgress && (
        <p className="text-xs text-slate-500">
          Analizando en las PCs de los arquitectos. Puede tardar unos minutos por página.
        </p>
      )}
      {document.status === 'failed' && document.error && (
        <p className="rounded-lg bg-state-danger/10 px-2 py-1.5 text-xs text-state-danger">{document.error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(document.status === 'draft' || document.status === 'failed') && (
          <Button size="sm" icon={document.status === 'failed' ? RotateCcw : Play} disabled={busy}
            onClick={() => onAnalyze(document)}>
            {document.status === 'failed' ? 'Reintentar' : 'Analizar'}
          </Button>
        )}
        {HAS_DATA.has(document.status) && (
          <Link to={`/folder-analysis/documents/${document.id}`}>
            <Button size="sm" icon={FileSearch} variant={document.status === 'extracted' ? 'primary' : 'secondary'}>
              {document.status === 'extracted' ? 'Revisar datos' : 'Ver datos'}
            </Button>
          </Link>
        )}
        <button
          type="button"
          title="Eliminar documento (las fotos vuelven a Fotos recibidas)"
          disabled={busy}
          onClick={() => onDelete(document)}
          className="ml-auto rounded-lg p-1.5 text-slate-400 transition hover:bg-state-danger/10 hover:text-state-danger disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  )
}

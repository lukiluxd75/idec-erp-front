import { ChevronLeft, ChevronRight, FileSearch, Hash, Play, RotateCcw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { CaptureImage } from '@/domains/folder-analysis/components/CaptureImage'
import { DocumentStatusBadge } from '@/domains/folder-analysis/components/DocumentStatusBadge'
import { IN_PROGRESS, LANE_ACCENT_CLASS, formatDateTime } from '@/domains/folder-analysis/utils/documentMeta'
import { getDraggedCapture, isCaptureDrag } from '@/domains/folder-analysis/utils/dragData'
import { Button, IconButton } from '@/shared/ui'
import { cn } from '@/shared/utils'

const PAGES_EDITABLE = new Set(['draft', 'failed'])
const HAS_DATA = new Set(['extracted', 'reviewed'])

function shortRef(id) {
  if (!id || typeof id !== 'string') return '—'
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

/** Compact list row for a document in a lane (not a dashboard module tile). */
export function DocumentCard({ document, multiPage, busy, onAddPage, onSetPages, onAnalyze, onDelete }) {
  const [dragOver, setDragOver] = useState(false)
  const inProgress = IN_PROGRESS.has(document.status)
  const pagesEditable = PAGES_EDITABLE.has(document.status) && !busy
  const acceptsDrop = pagesEditable && multiPage
  const ids = document.pages.map((p) => p.capture_id)
  const laneAccent = LANE_ACCENT_CLASS[document.doc_type] || 'border-l-slate-300'

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
        'workbench-work-row border-l-[3px] px-3 py-3 sm:px-4',
        laneAccent,
        dragOver && 'workbench-work-row--drop-target'
      )}
    >
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:gap-4">
        <ol className="flex min-w-0 flex-1 list-none gap-1.5 overflow-x-auto pb-0.5 lg:max-w-[55%]">
          {document.pages.map((page, index) => (
            <li key={page.capture_id} className="relative shrink-0">
              <CaptureImage
                captureId={page.capture_id}
                className="h-16 w-12 rounded-md object-cover ring-1 ring-slate-200/90"
              />
              <span className="absolute bottom-1 left-1 rounded bg-slate-900/75 px-1 text-[9px] font-bold text-white">
                {index + 1}
              </span>
              {pagesEditable && (
                <div className="absolute inset-x-0 top-0 flex justify-between p-0.5">
                  <div className="flex">
                    {index > 0 && (
                      <button
                        type="button"
                        title="Mover antes"
                        onClick={() => move(index, -1)}
                        className="rounded bg-white/95 p-px text-slate-600 ring-1 ring-slate-200/80"
                      >
                        <ChevronLeft className="h-2.5 w-2.5" />
                      </button>
                    )}
                    {index < ids.length - 1 && (
                      <button
                        type="button"
                        title="Mover después"
                        onClick={() => move(index, 1)}
                        className="rounded bg-white/95 p-px text-slate-600 ring-1 ring-slate-200/80"
                      >
                        <ChevronRight className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                  {ids.length > 1 && (
                    <button
                      type="button"
                      title="Quitar página"
                      onClick={() => remove(index)}
                      className="rounded bg-white/95 p-px text-slate-600 ring-1 ring-slate-200/80 hover:text-state-danger"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
          {acceptsDrop && (
            <li className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-300 text-[8px] font-bold uppercase leading-tight text-slate-400">
              + pág.
            </li>
          )}
        </ol>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 font-bold tabular-nums text-slate-700">
                  <Hash className="h-3 w-3 text-slate-400" aria-hidden />
                  {shortRef(document.id)}
                </span>
                <span>
                  {document.pages.length} {document.pages.length === 1 ? 'página' : 'páginas'}
                </span>
                <span>{formatDateTime(document.created_at)}</span>
              </p>
            </div>
            <DocumentStatusBadge status={document.status} />
          </div>

          {inProgress && (
            <p className="text-xs text-accent-800">
              {document.doc_type === 'folio'
                ? 'Leyendo el folio con OCR en el servidor…'
                : 'Analizando en las PCs de los arquitectos…'}
            </p>
          )}
          {document.status === 'failed' && document.error && (
            <p className="text-xs text-state-danger">{document.error}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {(document.status === 'draft' || document.status === 'failed') && (
              <Button
                size="sm"
                icon={document.status === 'failed' ? RotateCcw : Play}
                disabled={busy}
                onClick={() => onAnalyze(document)}
              >
                {document.status === 'failed' ? 'Reintentar' : 'Analizar'}
              </Button>
            )}
            {HAS_DATA.has(document.status) && (
              <Link to={`/folder-analysis/documents/${document.id}`}>
                <Button
                  size="sm"
                  icon={FileSearch}
                  variant={document.status === 'extracted' ? 'primary' : 'secondary'}
                >
                  {document.status === 'extracted' ? 'Revisar' : 'Ver datos'}
                </Button>
              </Link>
            )}
            <IconButton
              icon={Trash2}
              tone="danger"
              title="Eliminar documento"
              disabled={busy}
              onClick={() => onDelete(document)}
            />
          </div>
        </div>
      </div>
    </article>
  )
}

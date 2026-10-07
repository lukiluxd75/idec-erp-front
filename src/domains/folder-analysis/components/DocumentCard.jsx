import { ChevronLeft, ChevronRight, FileSearch, Hash, Play, RotateCcw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { CaptureImage } from '@/domains/folder-analysis/components/CaptureImage'
import { CaptureLightbox } from '@/domains/folder-analysis/components/CaptureLightbox'
import { DocumentStatusBadge } from '@/domains/folder-analysis/components/DocumentStatusBadge'
import { ReadingProgress } from '@/domains/folder-analysis/components/ReadingProgress'
import {
  IN_PROGRESS,
  LANE_ACCENT_CLASS,
  NOT_READ,
  formatDateTime,
} from '@/domains/folder-analysis/utils/documentMeta'
import { prefetchCapture } from '@/domains/folder-analysis/utils/captureImages'
import { getDraggedCapture, isCaptureDrag } from '@/domains/folder-analysis/utils/dragData'
import { Button, IconButton } from '@/shared/ui'
import { cn } from '@/shared/utils'

const PAGES_EDITABLE = new Set(['draft', 'failed', 'filed'])
const HAS_DATA = new Set(['extracted', 'reviewed'])

function shortRef(id) {
  if (!id || typeof id !== 'string') return '—'
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

/** Compact list row for a document in a lane (not a dashboard module tile). */
export function DocumentCard({ document, multiPage, busy, onAddPage, onSetPages, onAnalyze, onDelete }) {
  const [dragOver, setDragOver] = useState(false)
  // Which page was clicked to be looked at big, before deciding anything about it.
  const [opened, setOpened] = useState(null)
  const inProgress = IN_PROGRESS.has(document.status)
  // Otros documentos no se analizan: se guardan con sus fotos y nada más.
  const read = !NOT_READ.has(document.doc_type)
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
        <ol className="flex max-h-[15.5rem] min-w-0 list-none flex-wrap content-start gap-2 overflow-y-auto pb-0.5 pr-0.5 lg:max-w-[58%]">
          {document.pages.map((page, index) => (
            <li key={page.capture_id} className="relative shrink-0">
              <button
                type="button"
                title={`Ver la página ${index + 1} en grande`}
                onClick={() => setOpened(index)}
                onMouseEnter={() => prefetchCapture(page.capture_id, 'preview')}
                className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
              >
                <CaptureImage
                  captureId={page.capture_id}
                  className="h-28 w-20 cursor-zoom-in rounded-md object-cover ring-1 ring-slate-200/90 transition hover:ring-2 hover:ring-accent-400"
                />
              </button>
              <span className="absolute bottom-1 left-1 rounded bg-slate-900/75 px-1.5 text-[10px] font-bold text-white">
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
                        className="rounded bg-white/95 p-0.5 text-slate-600 ring-1 ring-slate-200/80"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </button>
                    )}
                    {index < ids.length - 1 && (
                      <button
                        type="button"
                        title="Mover después"
                        onClick={() => move(index, 1)}
                        className="rounded bg-white/95 p-0.5 text-slate-600 ring-1 ring-slate-200/80"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {ids.length > 1 && (
                    <button
                      type="button"
                      title="Quitar página"
                      onClick={() => remove(index)}
                      className="rounded bg-white/95 p-0.5 text-slate-600 ring-1 ring-slate-200/80 hover:text-state-danger"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
          {acceptsDrop && (
            <li className="flex h-28 w-20 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] font-bold uppercase leading-tight text-slate-400">
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
            <DocumentStatusBadge status={read ? document.status : 'filed'} />
          </div>

          {inProgress && <ReadingProgress document={document} />}
          {document.status === 'failed' && document.error && (
            <p className="text-xs text-state-danger">{document.error}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {read && (document.status === 'draft' || document.status === 'failed') && (
              <Button
                size="sm"
                icon={document.status === 'failed' ? RotateCcw : Play}
                disabled={busy}
                onClick={() => onAnalyze(document)}
              >
                {document.status === 'failed' ? 'Reintentar' : 'Analizar'}
              </Button>
            )}
            {read && HAS_DATA.has(document.status) && (
              <Link to={`/folder-analysis/documents/${document.id}`}>
                <Button
                  size="sm"
                  icon={FileSearch}
                  variant={document.status === 'extracted' ? 'primary' : 'secondary'}
                >
                  {document.status === 'extracted' ? 'Revisar datos' : 'Ver datos'}
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

      {opened !== null && (
        <CaptureLightbox
          items={document.pages.map((p, i) => ({ captureId: p.capture_id, label: `Página ${i + 1}` }))}
          startAt={opened}
          onClose={() => setOpened(null)}
        />
      )}
    </article>
  )
}

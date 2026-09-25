import { GripVertical, Inbox, Smartphone, Trash2 } from 'lucide-react'

import { CaptureImage } from '@/domains/folder-analysis/components/CaptureImage'
import { DOC_TYPES, LANE_THEME, formatDateTime } from '@/domains/folder-analysis/utils/documentMeta'
import { setDraggedCapture } from '@/domains/folder-analysis/utils/dragData'
import { EmptyState } from '@/shared/ui'
import { cn } from '@/shared/utils'

/**
 * Professional capture queue — operational inbox, not module catalog tiles.
 */
export function InboxPanel({ captures, disabled, onSend, onDelete }) {
  return (
    <section className="workbench-queue max-h-[calc(100dvh-14rem)] lg:max-h-[32rem]" aria-label="Cola de fotos recibidas">
      <div className="workbench-queue__head sticky top-0 z-[1] bg-slate-50/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 shrink-0 text-accent-600" aria-hidden />
          <h3 className="flex-1 text-sm font-bold text-slate-900">Fotos recibidas</h3>
          <span className="text-xs font-bold tabular-nums text-slate-600">{captures.length}</span>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          Cola móvil · arrastre o asigne a un carril
        </p>
      </div>

      {captures.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={Smartphone}
            iconSize={40}
            className="py-8"
            title="No hay fotos pendientes"
            subtitle="Tómelas desde la aplicación móvil y aparecerán aquí en unos segundos."
          />
        </div>
      ) : (
        <ul className="workbench-queue__list" role="list">
          {captures.map((capture) => (
            <li
              key={capture.id}
              draggable={!disabled}
              onDragStart={(e) => setDraggedCapture(e, capture.id)}
              className={cn('workbench-queue-row group cursor-grab', disabled && 'pointer-events-none opacity-55')}
            >
              <div className="flex h-full items-center pt-1 text-slate-300 group-hover:text-slate-500">
                <GripVertical className="h-4 w-4" aria-hidden />
              </div>

              <CaptureImage
                captureId={capture.id}
                alt={capture.file_name}
                className="h-[4.25rem] w-[3.25rem] shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-slate-200/90"
              />

              <div className="min-w-0 space-y-2">
                <div>
                  <p className="truncate text-sm font-semibold text-slate-800" title={capture.file_name}>
                    {capture.file_name || 'Captura móvil'}
                  </p>
                  <p className="text-[11px] text-slate-500">{formatDateTime(capture.created_at)}</p>
                </div>
                <div className="workbench-assign" role="group" aria-label="Asignar a carril">
                  {DOC_TYPES.map((type) => {
                    const theme = LANE_THEME[type.id]
                    return (
                      <button
                        key={type.id}
                        type="button"
                        disabled={disabled}
                        title={`Enviar a ${type.label}`}
                        onClick={() => onSend(type.id, capture.id)}
                        className={cn('workbench-assign-btn', theme?.assignBtn)}
                      >
                        <type.icon className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">{type.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                type="button"
                title="Eliminar foto"
                disabled={disabled}
                onClick={() => onDelete(capture)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-state-danger/10 hover:text-state-danger disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

import { GripVertical, Inbox, Trash2 } from 'lucide-react'

import { CaptureImage } from '@/domains/folder-analysis/components/CaptureImage'
import { DOC_TYPES, formatDateTime } from '@/domains/folder-analysis/utils/documentMeta'
import { setDraggedCapture } from '@/domains/folder-analysis/utils/dragData'
import { EmptyState } from '@/shared/ui'

/**
 * Photos sent from the phone that are not in a document yet. Each one is dragged
 * onto a section; the small buttons do the same for whoever prefers clicking.
 */
export function InboxPanel({ captures, disabled, onSend, onDelete }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/60 p-4">
      <header className="flex items-center gap-2">
        <Inbox className="h-4 w-4 text-accent-600" />
        <h3 className="text-sm font-bold text-slate-800">Fotos recibidas</h3>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {captures.length}
        </span>
      </header>
      <p className="text-xs text-slate-500">
        Arrastre cada foto al apartado que corresponda: Folio, Impuesto o Plano.
      </p>

      {captures.length === 0 ? (
        <EmptyState
          icon={Inbox}
          iconSize={36}
          className="py-10"
          title="No hay fotos pendientes"
          subtitle="Tómelas desde la aplicación móvil y aparecerán aquí en unos segundos."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {captures.map((capture) => (
            <li
              key={capture.id}
              draggable={!disabled}
              onDragStart={(e) => setDraggedCapture(e, capture.id)}
              className="group flex cursor-grab flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition hover:border-accent-300 hover:shadow-md active:cursor-grabbing"
            >
              <div className="relative">
                <CaptureImage captureId={capture.id} alt={capture.file_name} className="h-28 w-full" />
                <GripVertical className="absolute left-1 top-1 h-4 w-4 rounded bg-white/80 text-slate-500" />
                <button
                  type="button"
                  title="Eliminar foto"
                  disabled={disabled}
                  onClick={() => onDelete(capture)}
                  className="absolute right-1 top-1 rounded-lg bg-white/90 p-1 text-slate-500 opacity-0 transition hover:text-state-danger group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex flex-col gap-1.5 p-2">
                <p className="truncate text-[11px] text-slate-400">{formatDateTime(capture.created_at)}</p>
                <div className="flex gap-1">
                  {DOC_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      disabled={disabled}
                      title={`Enviar a ${type.label}`}
                      onClick={() => onSend(type.id, capture.id)}
                      className="flex flex-1 items-center justify-center rounded-md bg-slate-50 py-1 text-slate-500 ring-1 ring-slate-200 transition hover:bg-accent-50 hover:text-accent-600 disabled:opacity-50"
                    >
                      <type.icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

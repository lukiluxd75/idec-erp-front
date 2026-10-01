import { GripVertical, Inbox, Smartphone, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { CaptureImage } from '@/domains/folder-analysis/components/CaptureImage'
import { CaptureLightbox } from '@/domains/folder-analysis/components/CaptureLightbox'
import { CaptureUploader } from '@/domains/folder-analysis/components/CaptureUploader'
import { LANE_THEME, formatDateTime } from '@/domains/folder-analysis/utils/documentMeta'
import { prefetchCapture } from '@/domains/folder-analysis/utils/captureImages'
import { setDraggedCapture } from '@/domains/folder-analysis/utils/dragData'
import { EmptyState, PhoneConnectedBadge } from '@/shared/ui'
import { cn } from '@/shared/utils'

/**
 * Professional capture queue — operational inbox, not module catalog tiles.
 *
 * `types` son los carriles a los que se puede mandar una foto: los del tipo de
 * carpeta en la que se está trabajando. La bandeja en sí es siempre la misma --
 * las fotos llegan del celular sin saber a qué carpeta van.
 */
export function InboxPanel({
  captures,
  disabled,
  uploading,
  onUpload,
  onSend,
  onDelete,
  onClearAll,
  types,
  phoneConnected = false,
}) {
  // The photo clicked in the queue, opened big: from a thumbnail this small the
  // architect cannot tell a folio from a comprobante before sorting it.
  const [opened, setOpened] = useState(null)
  const items = captures.map((c) => ({ captureId: c.id, label: c.file_name || 'Captura móvil' }))
  const openedIndex = opened ? captures.findIndex((c) => c.id === opened) : -1

  return (
    <section className="workbench-queue max-h-[calc(100dvh-14rem)] lg:max-h-[32rem]" aria-label="Cola de fotos recibidas">
      <div className="workbench-queue__head sticky top-0 z-[1] bg-slate-50/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 shrink-0 text-accent-600" aria-hidden />
          <h3 className="flex-1 text-sm font-bold text-slate-900">Fotos recibidas</h3>
          <span className="text-xs font-bold tabular-nums text-slate-600">{captures.length}</span>
          {/* Vaciar toda la bandeja: con treinta fotos subidas de más, borrarlas
              de a una es el trabajo que este botón evita. */}
          {captures.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={onClearAll}
              title="Eliminar todas las fotos de la bandeja"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-state-danger/10 hover:text-state-danger disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Vaciar
            </button>
          )}
        </div>
        {/* El indicador va aquí, en la cabecera de la bandeja, porque esta es
            la pantalla donde aparecen las fotos del celular: si no llega
            ninguna, lo primero que hay que poder descartar es que el celular no
            esté conectado. Se muestra siempre, encendido o apagado. */}
        <div className="mt-2">
          <PhoneConnectedBadge connected={phoneConnected} />
        </div>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          Celular o equipo · arrastre o asigne a un carril
        </p>
        <CaptureUploader disabled={disabled} uploading={uploading} onFiles={onUpload} />
      </div>

      {captures.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={Smartphone}
            iconSize={40}
            className="py-8"
            title="No hay fotos pendientes"
            subtitle="Tómelas con la aplicación móvil o súbalas desde el explorador de archivos de su equipo."
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

              <button
                type="button"
                title="Ver la foto en grande"
                onClick={() => setOpened(capture.id)}
                onMouseEnter={() => prefetchCapture(capture.id, 'preview')}
                onFocus={() => prefetchCapture(capture.id, 'preview')}
                className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
              >
                <CaptureImage
                  captureId={capture.id}
                  alt={capture.file_name}
                  className="h-[4.25rem] w-[3.25rem] cursor-zoom-in rounded-lg object-cover shadow-sm ring-1 ring-slate-200/90 transition hover:ring-2 hover:ring-accent-400"
                />
              </button>

              <div className="min-w-0 space-y-2">
                <div>
                  <p className="truncate text-sm font-semibold text-slate-800" title={capture.file_name}>
                    {capture.file_name || 'Captura móvil'}
                  </p>
                  <p className="text-[11px] text-slate-500">{formatDateTime(capture.created_at)}</p>
                </div>
                <div className="workbench-assign" role="group" aria-label="Asignar a carril">
                  {types.map((type) => {
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

      {openedIndex >= 0 && (
        <CaptureLightbox items={items} startAt={openedIndex} onClose={() => setOpened(null)} />
      )}
    </section>
  )
}

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FileSearch, GripHorizontal, X } from 'lucide-react'
import EntriesPanel from './EntriesPanel'

/** Draggable modal for the full SISCAT case file (drag by the header). */
export default function SiscatFileModal({ open, row, onClose }) {
  const [pos, setPos] = useState({ x: 48, y: 48 })
  const dragRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    // Centrar aproximadamente al abrir
    const w = Math.min(920, window.innerWidth - 32)
    const h = Math.min(window.innerHeight - 64, 720)
    setPos({
      x: Math.max(16, (window.innerWidth - w) / 2),
      y: Math.max(16, (window.innerHeight - h) / 2),
    })
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return undefined
    function onMove(e) {
      const d = dragRef.current
      if (!d?.active) return
      const nx = e.clientX - d.ox
      const ny = e.clientY - d.oy
      const maxX = window.innerWidth - 120
      const maxY = window.innerHeight - 56
      setPos({
        x: Math.max(8, Math.min(maxX, nx)),
        y: Math.max(8, Math.min(maxY, ny)),
      })
    }
    function onUp() {
      if (dragRef.current) dragRef.current.active = false
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [open])

  if (!open) return null

  const codigo = row?.codigo_catastral || '—'
  const asientos = row?.asientos_catastro || row?.asientos_fields?.asientos_catastro
  const vigente = asientos?.vigente || (asientos?.registros || []).find((r) => r.vigente)
  const asientoVig = vigente?.asiento || asientos?.vigente?.asiento
  const width = Math.min(920, typeof window !== 'undefined' ? window.innerWidth - 32 : 920)
  const maxHeight = typeof window !== 'undefined' ? window.innerHeight - 32 : 720

  const panel = (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: 10060 }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Expediente SISCAT ${codigo}`}
        className="pointer-events-auto absolute flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/25"
        style={{
          left: pos.x,
          top: pos.y,
          width,
          maxHeight,
        }}
      >
        <header
          className="flex cursor-grab items-center gap-2 border-b border-slate-200 bg-brand-800 px-3 py-2.5 text-white active:cursor-grabbing"
          onPointerDown={(e) => {
            if (e.button !== 0) return
            if (e.target.closest('button')) return
            dragRef.current = {
              active: true,
              ox: e.clientX - pos.x,
              oy: e.clientY - pos.y,
            }
            e.currentTarget.setPointerCapture?.(e.pointerId)
          }}
        >
          <GripHorizontal className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
          <FileSearch className="h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">Expediente SISCAT completo</p>
            <p className="truncate text-[11px] text-white/75">
              Código {codigo}
              {asientoVig ? ` · asiento vigente ${asientoVig}` : ''}
              {' · arrastre esta barra para mover'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar expediente"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
          <EntriesPanel row={row} />
        </div>
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}

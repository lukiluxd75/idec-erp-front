import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Generic design-system modal (see CLAUDE.md §3 — shared/ for domain-agnostic pieces).
 * Closes on Escape or click outside the panel.
 */
const SIZE_CLASS = {
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
}

export function Modal({ open, onClose, title, icon: Icon, children, className = '', size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const widthClass = SIZE_CLASS[size] || SIZE_CLASS.md

  return createPortal(
    <div
      // z-[2000]: Leaflet's own panes/controls go up to z-index 1000 (see
      // leaflet.css .leaflet-pane/.leaflet-top/.leaflet-bottom); z-50 let the
      // map (DetectionMap, ValidateEvidenceMaps, CompareZoomPanel) render on
      // top of every modal in the app, including ConfirmDialog.
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={`animate-card-in w-full ${widthClass} rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl ${className}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-300/30 text-accent-600">
                <Icon className="h-[18px] w-[18px]" />
              </span>
            )}
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {children}
      </div>
    </div>,
    document.body
  )
}

export default Modal

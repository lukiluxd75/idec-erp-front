import { useState } from 'react'

/** El texto que el OCR leyó de una página, plegado. */
export function PageText({ text, label = 'todo el texto leído en esta página' }) {
  const [open, setOpen] = useState(false)
  if (!text) return null

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-xs font-semibold text-accent-700 hover:underline"
      >
        {open ? 'Ocultar' : 'Ver'} {label}
      </button>
      {open && (
        <p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          {text}
        </p>
      )}
    </div>
  )
}

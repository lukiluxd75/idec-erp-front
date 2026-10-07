import { useState } from 'react'
import { ReportHelpBlock } from './ReportHelp'

/** Sección colapsable con ayuda opcional al expandir. */
export function Collapse({ title, caption, helpId, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <details className="collapse" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span>{title}</span>
        {caption ? <small>{caption}</small> : null}
        <em>{open ? 'Ocultar' : 'Ver tabla'}</em>
      </summary>
      {open ? (
        <div className="collapse-body">
          {helpId ? <ReportHelpBlock helpId={helpId} className="help-in-collapse" /> : null}
          {children}
        </div>
      ) : null}
    </details>
  )
}

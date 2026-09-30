import { useState } from 'react'

/** Exact port of the standalone project's Collapse component -- native
 * <details>, same markup/classes (see ../pages/ReportsPage.css). */
export function Collapse({ title, caption, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <details className="collapse" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span>{title}</span>
        {caption ? <small>{caption}</small> : null}
        <em>{open ? 'Ocultar' : 'Ver tabla'}</em>
      </summary>
      {open ? <div className="collapse-body">{children}</div> : null}
    </details>
  )
}

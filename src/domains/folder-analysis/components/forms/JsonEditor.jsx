import { useState } from 'react'

import { cn } from '@/shared/utils'

/**
 * Plain JSON editor, used for plans until their fields are defined. Reports the
 * parsed object only while the text is valid JSON; `onInvalid` tells the page to
 * block saving meanwhile.
 */
export function JsonEditor({ value, onChange, onInvalid }) {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2))
  const [error, setError] = useState(null)

  const handle = (next) => {
    setText(next)
    try {
      const parsed = JSON.parse(next)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Debe ser un objeto JSON ({ ... }).')
      }
      setError(null)
      onInvalid(false)
      onChange(parsed)
    } catch (e) {
      setError(e.message)
      onInvalid(true)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-500">
        Los campos del plano todavía no están definidos: corrija aquí el texto, los datos y las tablas detectados.
      </p>
      <textarea
        value={text}
        onChange={(e) => handle(e.target.value)}
        spellCheck={false}
        rows={24}
        className={cn(
          'w-full rounded-xl border bg-white p-3 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2',
          error ? 'border-state-danger/50 focus:ring-state-danger/30' : 'border-slate-200 focus:ring-accent-300/40'
        )}
      />
      {error && <p className="text-xs text-state-danger">JSON inválido: {error}</p>}
    </div>
  )
}

import { cn } from '@/shared/utils'

/** Labeled text box for one extracted value. */
export function FieldInput({ label, value, onChange, multiline = false, warn = false, className = '' }) {
  const common = cn(
    'w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2',
    warn
      ? 'border-state-amber/60 bg-state-amber/5 focus:border-state-amber focus:ring-state-amber/30'
      : 'border-slate-200 focus:border-accent-400 focus:ring-accent-300/40'
  )
  const handle = (e) => onChange(e.target.value === '' ? null : e.target.value)

  return (
    <label className={cn('flex flex-col gap-1', className)}>
      {(label || warn) && (
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
          {warn && (
            <span
              title="La lectura no fue segura: compare con la foto."
              className="rounded bg-state-amber/15 px-1 text-[9px] font-bold text-state-orange-deep"
            >
              revisar
            </span>
          )}
        </span>
      )}
      {multiline ? (
        <textarea rows={2} value={value ?? ''} onChange={handle} className={cn(common, 'resize-y')} />
      ) : (
        <input type="text" value={value ?? ''} onChange={handle} className={common} />
      )}
    </label>
  )
}

import { cn } from '@/shared/utils'

/** Labeled text box for one extracted value. Empty text is stored as null. */
export function FieldInput({ label, value, onChange, multiline = false, className = '' }) {
  const common =
    'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-xs focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-300/40'
  const handle = (e) => onChange(e.target.value === '' ? null : e.target.value)

  return (
    <label className={cn('flex flex-col gap-1', className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {multiline ? (
        <textarea rows={2} value={value ?? ''} onChange={handle} className={cn(common, 'resize-y')} />
      ) : (
        <input type="text" value={value ?? ''} onChange={handle} className={common} />
      )}
    </label>
  )
}

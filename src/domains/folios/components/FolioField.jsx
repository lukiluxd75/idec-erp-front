import { getAt } from '@/domains/folios/utils/folioData'
import { useFolioForm, useIsLow } from '@/domains/folios/utils/folioFormContext'
import { cn } from '@/shared/utils'

const INPUT_CLASS =
  'w-full min-w-0 rounded-lg border bg-white/70 px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-300 outline-none transition-colors focus:border-accent-500/60 focus:bg-white focus-visible:ring-2 focus-visible:ring-accent-400/40 disabled:bg-slate-50 disabled:text-slate-600'

export function FolioField({
  label,
  path,
  flagPath,
  placeholder,
  multiline = false,
  parse,
  format,
  className = '',
}) {
  const { data, update, readOnly } = useFolioForm()
  const low = useIsLow(path, flagPath || path)
  const raw = getAt(data, path)
  const value = format ? format(raw) : (raw ?? '')

  const onChange = (e) => {
    const text = e.target.value
    update(path, parse ? parse(text) : text === '' ? null : text, flagPath || path)
  }

  const Tag = multiline ? 'textarea' : 'input'
  return (
    <label className={cn('flex min-w-0 flex-col gap-1', className)}>
      {label && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          {label}
          {low && <span className="rounded bg-state-danger/10 px-1 text-[10px] font-semibold text-state-danger">revisar</span>}
        </span>
      )}
      <Tag
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={readOnly}
        rows={multiline ? 2 : undefined}
        className={cn(INPUT_CLASS, multiline && 'resize-y', low ? 'border-state-danger/60 bg-state-danger/5' : 'border-slate-200')}
      />
    </label>
  )
}

export function FolioSelect({ label, path, options, className = '' }) {
  const { data, update, readOnly } = useFolioForm()
  const value = getAt(data, path) ?? ''
  return (
    <label className={cn('flex min-w-0 flex-col gap-1', className)}>
      {label && <span className="text-xs font-medium text-slate-500">{label}</span>}
      <select
        value={value}
        disabled={readOnly}
        onChange={(e) => update(path, e.target.value || null)}
        className={cn(INPUT_CLASS, 'border-slate-200')}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {value && !options.some((o) => o.value === value) && <option value={value}>{value}</option>}
      </select>
    </label>
  )
}

export function FormSection({ title, icon: Icon, children, actions }) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          {Icon && <Icon className="h-4 w-4 text-accent-600" />}
          {title}
        </h3>
        {actions}
      </div>
      {children}
    </section>
  )
}

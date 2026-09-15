import { cn } from '@/shared/utils'

/** Styled select matching Input — used when the value must come from a closed list (e.g. assign existing role/area). */
export function Select({
  id,
  name,
  label,
  error,
  className = '',
  containerClassName = '',
  children,
  ...props
}) {
  return (
    <div className={cn('flex flex-col', containerClassName)}>
      {label && (
        <label htmlFor={id || name} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <select
        id={id || name}
        name={name}
        aria-invalid={Boolean(error)}
        className={cn(
          'w-full rounded-xl border bg-white/60 px-4 py-3 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-accent-500/60 focus:bg-white focus-visible:ring-2 focus-visible:ring-accent-400/40',
          error ? 'border-state-danger/50' : 'border-slate-200',
          className
        )}
        {...props}
      >
        {children}
      </select>

      {error && <p className="mt-1.5 text-xs text-state-danger">{error}</p>}
    </div>
  )
}

export default Select

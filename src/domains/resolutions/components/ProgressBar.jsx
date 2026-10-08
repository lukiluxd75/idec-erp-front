import { cn } from '@/shared/utils'

/** Barra de progreso accesible. `value` y `max` en unidades (p. ej. páginas); `label` dice qué se está haciendo. */
export function ProgressBar({ value, max, label, className }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={cn('w-full', className)}>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-xs text-slate-500">
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums font-semibold text-slate-600">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80"
      >
        <div
          className="h-full rounded-full bg-accent-500 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

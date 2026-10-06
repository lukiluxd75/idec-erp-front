import { Plus, X } from 'lucide-react'

import { joinValues, splitValues } from '@/domains/folder-analysis/utils/multiValue'
import { cn } from '@/shared/utils'

/** Un campo que lleva VARIOS valores, con un apartado para cada uno. */

export function MultiFieldInput({ label, itemLabel, value, onChange, warn = false, className = '' }) {
  const items = splitValues(value)
  const several = items.length > 1

  const replace = (index, next) => onChange(joinValues(items.map((item, i) => (i === index ? next : item))))
  const remove = (index) => onChange(joinValues(items.filter((_item, i) => i !== index)))
  // Una caja vacía al final.
  const add = () => onChange(joinValues([...items, '']))

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {several && (
          <span className="rounded bg-accent-600/10 px-1.5 text-[10px] font-bold tabular-nums text-accent-800">
            {items.length}
          </span>
        )}
        {warn && (
          <span
            title="La lectura no fue segura: compare con la foto."
            className="rounded bg-state-amber/15 px-1 text-[9px] font-bold text-state-orange-deep"
          >
            revisar
          </span>
        )}
      </span>

      <div className="flex flex-col gap-1.5">
        {items.map((item, index) => (
          // El índice como clave: estas cajas no son una lista que se reordene, son los huecos de un campo.
          <div key={index} className="flex items-center gap-1.5">
            {several && (
              <span className="w-[5.5rem] shrink-0 truncate text-[11px] font-semibold text-slate-500">
                {itemLabel ? `${itemLabel} ${index + 1}` : `${index + 1}.`}
              </span>
            )}
            <input
              type="text"
              value={item}
              onChange={(event) => replace(index, event.target.value)}
              className={cn(
                'w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2',
                warn
                  ? 'border-state-amber/60 bg-state-amber/5 focus:border-state-amber focus:ring-state-amber/30'
                  : 'border-slate-200 focus:border-accent-400 focus:ring-accent-300/40'
              )}
            />
            {several && (
              <button
                type="button"
                onClick={() => remove(index)}
                title={itemLabel ? `Quitar este ${itemLabel.toLowerCase()}` : 'Quitar'}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-state-danger/10 hover:text-state-danger"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="self-start inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-bold text-accent-700 transition hover:bg-accent-600/10"
      >
        <Plus className="h-3 w-3" aria-hidden />
        Agregar {itemLabel ? itemLabel.toLowerCase() : 'otro'}
      </button>
    </div>
  )
}

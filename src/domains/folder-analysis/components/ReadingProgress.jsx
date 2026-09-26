import { readingProgress } from '@/domains/folder-analysis/utils/readingProgress'
import { cn } from '@/shared/utils'

/** Inline reading bar for the lane card and the review screen. */
export function ReadingProgress({ pages, className = '' }) {
  const { percent, done, total, assembling } = readingProgress(pages)

  return (
    <div className={cn('flex flex-col gap-1', className)} role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-semibold text-accent-800">
          {assembling
            ? 'Interpretando los datos leídos…'
            : `Leyendo ${Math.min(done + 1, total)} de ${total} ${total === 1 ? 'foto' : 'fotos'}…`}
        </span>
        <span className="font-bold tabular-nums text-slate-600">{percent}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            'h-full rounded-full bg-accent-500 transition-[width] duration-700 ease-out',
            assembling && 'animate-pulse'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

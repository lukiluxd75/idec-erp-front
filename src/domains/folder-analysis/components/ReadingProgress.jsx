import { PHASE_META, formatEta, readingHeadline } from '@/domains/folder-analysis/utils/readingProgress'
import { useReadingProgress } from '@/domains/folder-analysis/utils/useReadingProgress'
import { cn } from '@/shared/utils'

/**
 * Inline progress for the lane card and the review screen: the stage the document
 * is in, a bar that keeps moving between polls, and what is left to wait.
 */
export function ReadingProgress({ document, className = '' }) {
  const progress = useReadingProgress(document)
  const { phase, percent, etaSec } = progress
  if (!progress.live) return null

  const queued = phase === 'queued'

  return (
    <div className={cn('flex flex-col gap-1', className)} role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className={cn('font-semibold', queued ? 'text-slate-600' : 'text-accent-800')}>
          {readingHeadline(progress)}
        </span>
        <span className="font-bold tabular-nums text-slate-600">{percent}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out',
            queued ? 'bg-slate-400' : 'bg-accent-500',
            phase === 'assembling' && 'animate-pulse'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-500">
        {PHASE_META[phase].label} · falta {formatEta(etaSec)}
      </p>
    </div>
  )
}

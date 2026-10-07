import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Circle, Loader2, Square } from 'lucide-react'
import { Button } from '@/shared/ui'

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m <= 0) return `${r} s`
  return `${m} min ${r} s`
}

function buildDetailLines(progress) {
  if (!progress) return []
  const lines = []
  if (progress.detail) {
    String(progress.detail)
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((l) => lines.push(l))
  }
  const sh = progress.phase_info?.shadows
  if (sh && ['shadows', 'detect', 'filter'].includes(progress.step)) {
    const a = sh.a || {}
    const b = sh.b || {}
    if (a.shadow_pct != null || b.shadow_pct != null) {
      lines.push(`Sombras ${sh.mode || '—'} · total ${sh.seconds != null ? `${sh.seconds} s` : '—'}`)
      lines.push(
        `A: ${a.shadow_pct != null ? `${a.shadow_pct} %` : '—'} · GPU ${a.gpu ?? '—'} · ${
          a.seconds != null ? `${a.seconds} s` : '—'
        }`
      )
      lines.push(
        `B: ${b.shadow_pct != null ? `${b.shadow_pct} %` : '—'} · GPU ${b.gpu ?? '—'} · ${
          b.seconds != null ? `${b.seconds} s` : '—'
        }`
      )
    }
  }
  if (progress.n_tiles && progress.n_tiles > 1) {
    const ti = progress.tile_index != null ? Number(progress.tile_index) + 1 : null
    lines.push(ti != null ? `Bloque ${ti}/${progress.n_tiles}` : `${progress.n_tiles} bloques`)
  }
  const uniq = []
  lines.forEach((l) => {
    if (l && !uniq.includes(l)) uniq.push(l)
  })
  return uniq
}

/** Blocking progress modal (like the prototype global loader). */
export default function DetectionProgressModal({
  open,
  progress,
  startedAt,
  cancelling = false,
  onCancel,
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!open) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => {
      document.body.style.overflow = prevOverflow
      clearInterval(t)
    }
  }, [open])

  const elapsedSec = startedAt ? Math.max(0, (now - startedAt) / 1000) : 0
  const pct = Math.max(0, Math.min(100, Number(progress?.pct) || 0))
  const title = progress?.step_label || progress?.step || 'Procesando detección…'
  const detailLines = useMemo(() => buildDetailLines(progress), [progress])
  const steps = Array.isArray(progress?.steps) ? progress.steps : []

  const etaSec = useMemo(() => {
    if (pct < 3 || elapsedSec < 2) return null
    const remaining = elapsedSec * ((100 - pct) / pct)
    if (!Number.isFinite(remaining) || remaining < 0) return null
    return remaining
  }, [pct, elapsedSec])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-950/80 p-4"
      style={{ zIndex: 10050 }}
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label="Progreso de detección"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') e.preventDefault()
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 text-white shadow-2xl">
        <div className="border-b border-slate-700/80 bg-gradient-to-r from-brand-800 to-brand-600 px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
            Motor GPU · detección en curso
          </p>
          <h2 className="mt-1 text-lg font-bold leading-snug">{title}</h2>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <Loader2 className="h-5 w-5 animate-spin text-accent-300" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-100">Avance del proceso</p>
                <span className="text-sm font-bold tabular-nums text-accent-300">{Math.round(pct)} %</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-accent-400 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>

          {detailLines.length > 0 && (
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
              {detailLines.join('\n')}
            </div>
          )}

          {steps.length > 0 && (
            <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950/40 p-3">
              {steps.map((step, idx) => {
                const status = step.status || 'pending'
                const label = step.label || step.id || `Paso ${idx + 1}`
                const done = status === 'done' || status === 'completed' || status === 'ok'
                const active = status === 'active' || status === 'running' || status === 'current'
                return (
                  <li
                    key={step.id || `${label}-${idx}`}
                    className={`flex items-center gap-2 text-xs ${
                      done
                        ? 'text-state-success-soft'
                        : active
                          ? 'font-semibold text-white'
                          : 'text-slate-400'
                    }`}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : active ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent-300" />
                    ) : (
                      <Circle className="h-3 w-3 shrink-0 opacity-50" />
                    )}
                    <span>{label}</span>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
            <p>
              <span className="text-slate-500">Transcurrido:</span>{' '}
              <span className="font-semibold tabular-nums text-slate-100">
                {formatDuration(elapsedSec)}
              </span>
            </p>
            <p>
              <span className="text-slate-500">Tiempo restante estimado:</span>{' '}
              <span className="font-semibold tabular-nums text-slate-100">
                {etaSec == null ? 'Calculando…' : `≈ ${formatDuration(etaSec)}`}
              </span>
            </p>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-400">
            La interfaz permanece bloqueada mientras el motor procesa. Puede detener el trabajo; la
            cancelación puede tardar unos segundos en aplicarse.
          </p>

          <Button
            variant="danger"
            className="w-full !bg-state-danger !text-white hover:!bg-state-magenta"
            onClick={onCancel}
            disabled={cancelling || !onCancel}
            loading={cancelling}
            icon={Square}
          >
            {cancelling ? 'Deteniendo…' : 'Detener proceso'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

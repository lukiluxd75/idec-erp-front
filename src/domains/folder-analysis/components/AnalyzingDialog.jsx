import { Check, CheckCircle2, Clock, FileSearch, Loader2, ScanText, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { DOC_TYPE_BY_ID } from '@/domains/folder-analysis/utils/documentMeta'
import {
  PHASE_META,
  formatDuration,
  formatEta,
  readingHeadline,
} from '@/domains/folder-analysis/utils/readingProgress'
import { useReadingProgress } from '@/domains/folder-analysis/utils/useReadingProgress'
import { Badge, Button, Modal } from '@/shared/ui'
import { cn } from '@/shared/utils'

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Percentage ring. Stroke is drawn as a dash of the circle's own length. */
function Ring({ percent, tone, spinning }) {
  return (
    <div className="relative mx-auto h-32 w-32">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="10" className="stroke-slate-200" />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
          className={cn('transition-[stroke-dashoffset] duration-500 ease-out', tone)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums text-slate-900">{percent}%</span>
        {spinning && <Loader2 className="mt-0.5 h-3.5 w-3.5 animate-spin text-accent-500" aria-hidden />}
      </div>
    </div>
  )
}

/** One photo of the document and what the server has done with it so far. */
function PageTicks({ pages, currentPage }) {
  if (pages.length <= 1) return null
  return (
    <ol className="flex flex-wrap justify-center gap-1.5">
      {pages.map((page, index) => {
        const done = page.status === 'done'
        const active = index + 1 === currentPage && !done
        return (
          <li
            key={page.capture_id}
            title={`Foto ${index + 1}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold tabular-nums',
              done
                ? 'border-state-success/30 bg-state-success/10 text-slate-700'
                : active
                  ? 'border-accent-400/40 bg-accent-300/20 text-accent-700'
                  : 'border-slate-200 bg-slate-50 text-slate-400'
            )}
          >
            {done ? (
              <Check className="h-3 w-3" aria-hidden />
            ) : active ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Clock className="h-3 w-3" aria-hidden />
            )}
            {index + 1}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Stays open while a document is being analyzed and turns into the result when it
 * ends, so the architect sees the whole run without watching the lane: which
 * stage it is in (waiting its turn or already being read), a bar that keeps
 * moving between the server's updates, and how long it still needs.
 */
export function AnalyzingDialog({ document, onClose }) {
  const progress = useReadingProgress(document)
  if (!document) return null

  const { phase, percent, done, total, etaSec, elapsedSec, perPageSec, samples } = progress
  // "el folio", "el comprobante": the dialog talks about the document at hand.
  const noun = DOC_TYPE_BY_ID[document.doc_type]?.noun || 'el documento'

  const failed = phase === 'failed'
  const finished = phase === 'done'
  // Between pressing "Analizar" and the server's first answer.
  const starting = phase === 'draft'
  const working = progress.live || starting
  const stage = PHASE_META[phase]

  return (
    <Modal
      open
      onClose={onClose}
      icon={finished ? CheckCircle2 : failed ? XCircle : ScanText}
      title={
        finished ? `Se leyó ${noun}` : failed ? `No se pudo leer ${noun}` : `Leyendo ${noun}`
      }
    >
      <div className="space-y-4">
        <Ring
          percent={percent}
          spinning={working}
          tone={
            finished
              ? 'stroke-state-success'
              : failed
                ? 'stroke-state-danger'
                : phase === 'queued' || starting
                  ? 'stroke-slate-400'
                  : 'stroke-accent-500'
          }
        />

        <div className="flex justify-center">
          <Badge variant={stage.variant} dot dotPulse={working}>
            {stage.label}
          </Badge>
        </div>

        <p className="text-center text-sm text-slate-600">
          {finished
            ? `Se leyeron ${total} ${total === 1 ? 'foto' : 'fotos'}. Revise los datos antes de guardarlos.`
            : failed
              ? document.error || 'La lectura falló.'
              : readingHeadline(progress)}
        </p>

        {working && <PageTicks pages={document.pages || []} currentPage={progress.currentPage} />}

        {(working || finished) && (
          <dl className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Transcurrido</dt>
              <dd className="text-sm font-bold tabular-nums text-slate-800">{formatDuration(elapsedSec)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {finished ? 'Fotos leídas' : 'Falta'}
              </dt>
              <dd className="text-sm font-bold tabular-nums text-slate-800">
                {finished ? `${done} de ${total}` : formatEta(etaSec)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Promedio</dt>
              <dd className="text-sm font-bold tabular-nums text-slate-800">
                {formatDuration(perPageSec)}
                <span className="block text-[10px] font-semibold text-slate-400">
                  por foto{samples > 0 ? ` · ${samples} ${samples === 1 ? 'lectura' : 'lecturas'}` : ' (estimado)'}
                </span>
              </dd>
            </div>
          </dl>
        )}

        {working && (
          <p className="text-center text-xs text-slate-500">
            Puede cerrar esta ventana: la lectura sigue y el carril se actualiza solo.
          </p>
        )}

        <div className="flex justify-center gap-2 pt-1">
          {finished && (
            <Link to={`/folder-analysis/documents/${document.id}`}>
              <Button icon={FileSearch}>Revisar datos</Button>
            </Link>
          )}
          <Button variant={finished || failed ? 'secondary' : 'ghost'} onClick={onClose}>
            {finished || failed ? 'Cerrar' : 'Seguir trabajando'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

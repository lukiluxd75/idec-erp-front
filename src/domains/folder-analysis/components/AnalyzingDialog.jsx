import { CheckCircle2, FileSearch, ScanText, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { readingProgress } from '@/domains/folder-analysis/utils/readingProgress'
import { Button, Modal } from '@/shared/ui'
import { cn } from '@/shared/utils'

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Percentage ring. Stroke is drawn as a dash of the circle's own length. */
function Ring({ percent, tone }) {
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
          className={cn('transition-[stroke-dashoffset] duration-700 ease-out', tone)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold tabular-nums text-slate-900">{percent}%</span>
      </div>
    </div>
  )
}

/**
 * Stays open while a folio is being read and turns into the result when it ends,
 * so the architect sees the whole run without watching the lane.
 */
export function AnalyzingDialog({ document, onClose }) {
  const pages = document?.pages || []
  const { percent, done, total, assembling } = readingProgress(pages)
  if (!document) return null

  const failed = document.status === 'failed'
  const finished = document.status === 'extracted' || document.status === 'reviewed'
  const shown = finished ? 100 : percent

  return (
    <Modal
      open
      onClose={onClose}
      icon={finished ? CheckCircle2 : failed ? XCircle : ScanText}
      title={finished ? 'Folio leído' : failed ? 'No se pudo leer el folio' : 'Leyendo el folio'}
    >
      <div className="space-y-4">
        <Ring
          percent={shown}
          tone={finished ? 'stroke-state-success' : failed ? 'stroke-state-danger' : 'stroke-accent-500'}
        />

        <p className="text-center text-sm text-slate-600">
          {finished
            ? `Se leyeron ${total} ${total === 1 ? 'foto' : 'fotos'}. Revise los datos antes de guardarlos.`
            : failed
              ? document.error || 'La lectura falló.'
              : assembling
                ? 'Interpretando los datos leídos…'
                : `Leyendo la foto ${Math.min(done + 1, total)} de ${total} con OCR en el servidor…`}
        </p>

        {!finished && !failed && (
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

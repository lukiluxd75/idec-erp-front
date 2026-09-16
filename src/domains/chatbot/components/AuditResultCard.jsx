import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Badge } from '@/shared/ui'

const ESTADO_MAP = {
  Aprobado: { variant: 'success', icon: CheckCircle2 },
  Rechazado: { variant: 'danger', icon: XCircle },
  Pendiente: { variant: 'warning', icon: Clock },
}

/**
 * Renders the document-audit JSON the assistant answers with when a citizen
 * lists which documents they have for a specific trámite (see the system
 * prompt in the backend's domain/services/prompt_builder.py) instead of
 * showing the raw JSON as text.
 */
export function AuditResultCard({ result }) {
  const estado = ESTADO_MAP[result.estado] || { variant: 'neutral', icon: Clock }
  const EstadoIcon = estado.icon

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Badge variant={estado.variant} dot>
          <EstadoIcon className="h-3.5 w-3.5" />
          {result.estado}
        </Badge>
      </div>

      {result.documentos_presentes?.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Documentos presentados</p>
          <ul className="mt-1 space-y-1 text-sm text-slate-700">
            {result.documentos_presentes.map((doc, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-state-success" />
                {doc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.documentos_faltantes?.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Documentos faltantes</p>
          <ul className="mt-1 space-y-1 text-sm text-slate-700">
            {result.documentos_faltantes.map((doc, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-state-danger" />
                {doc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.observaciones && (
        <p className="border-t border-slate-100 pt-3 text-sm text-slate-600">{result.observaciones}</p>
      )}
    </div>
  )
}

export default AuditResultCard

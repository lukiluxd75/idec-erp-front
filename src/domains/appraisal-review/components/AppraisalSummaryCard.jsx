import { ClipboardCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

/** One row in the pending-review queue. */
export function AppraisalSummaryCard({ appraisal }) {
  return (
    <Link to={`/appraisal-review/${encodeURIComponent(appraisal.form_number)}`}>
      <div className="flex h-full items-start gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-xs transition hover:border-accent-300 hover:bg-white hover:shadow-md">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600 ring-1 ring-accent-200">
          <ClipboardCheck className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold text-slate-900">Formulario N° {appraisal.form_number}</p>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
              {appraisal.status_name}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-500">{appraisal.address || 'Sin dirección registrada'}</p>
          <p className="mt-1 truncate text-xs text-slate-400">
            {appraisal.owner_name || 'Sin propietario registrado'} · {formatDate(appraisal.created_at)}
          </p>
        </div>
      </div>
    </Link>
  )
}

export default AppraisalSummaryCard

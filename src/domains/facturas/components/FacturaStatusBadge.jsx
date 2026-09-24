import { Badge } from '@/shared/ui'

const MAP = {
  pending: { variant: 'neutral', label: 'En cola', pulse: true },
  processing: { variant: 'accent', label: 'Procesando', pulse: true },
  ready: { variant: 'success', label: 'Listo' },
  needs_review: { variant: 'warning', label: 'Revisar' },
  failed: { variant: 'danger', label: 'Error' },
  confirmed: { variant: 'success', label: 'Confirmada' },
}

export function FacturaStatusBadge({ status }) {
  const it = MAP[status] || { variant: 'neutral', label: status }
  return (
    <Badge variant={it.variant} dot dotPulse={Boolean(it.pulse)}>
      {it.label}
    </Badge>
  )
}

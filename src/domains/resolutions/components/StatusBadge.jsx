import { Badge } from '@/shared/ui'

const MAP = {
  pendiente_ocr: { variant: 'warning', label: 'Pendiente' },
  en_proceso: { variant: 'accent', label: 'En proceso' },
  listo: { variant: 'success', label: 'Listo' },
}

export function StatusBadge({ status }) {
  const it = MAP[status] || { variant: 'neutral', label: status }
  return (
    <Badge variant={it.variant} dot>
      {it.label}
    </Badge>
  )
}

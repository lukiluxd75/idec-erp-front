import { Badge } from '@/shared/ui'

const MAP = {
  pendiente_ocr: { variant: 'warning', label: 'Pendiente' },
  en_proceso: { variant: 'accent', label: 'En proceso' },
  listo: { variant: 'success', label: 'Listo' },
}

export function EstadoBadge({ estado }) {
  const it = MAP[estado] || { variant: 'neutral', label: estado }
  return (
    <Badge variant={it.variant} dot>
      {it.label}
    </Badge>
  )
}

import { IN_PROGRESS, STATUS_META } from '@/domains/folder-analysis/utils/documentMeta'
import { Badge, Spinner } from '@/shared/ui'

export function DocumentStatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, variant: 'neutral' }
  return (
    <Badge variant={meta.variant}>
      {IN_PROGRESS.has(status) && <Spinner className="h-3 w-3" />}
      {meta.label}
    </Badge>
  )
}

import { CircleStop } from 'lucide-react'

import { WORKER_STATES, hostLabel, workerState } from '@/domains/digitization/utils/workerStatus'
import { Badge, Button } from '@/shared/ui'

export function WorkerCard({ worker, onStop, stopping = false }) {
  const state = workerState(worker)
  const { label, variant, icon: Icon, iconClass, detail } = WORKER_STATES[state]
  // Anything the PC is busy with can be cut short, whoever started it: a document
  // from the digitization queue or a call another module borrowed the PC for.
  const canStop = Boolean(onStop && worker.used_by)

  return (
    <div className="flex h-full items-start gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-xs">
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${iconClass}`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold text-slate-900">{hostLabel(worker.host)}</p>
          <Badge variant={variant} dot dotPulse={state === 'working'}>
            {label}
          </Badge>
        </div>
        <p className="mt-0.5 text-sm text-slate-500">{detail(worker)}</p>

        {canStop && (
          <Button
            variant="danger"
            size="sm"
            icon={CircleStop}
            loading={stopping}
            onClick={() => onStop(worker)}
            className="mt-3"
          >
            Detener
          </Button>
        )}
      </div>
    </div>
  )
}

export default WorkerCard

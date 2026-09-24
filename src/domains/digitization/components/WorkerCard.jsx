import { WORKER_STATES, hostLabel, workerState } from '@/domains/digitization/utils/workerStatus'
import { Badge } from '@/shared/ui'

export function WorkerCard({ worker }) {
  const state = workerState(worker)
  const { label, variant, icon: Icon, iconClass, detail } = WORKER_STATES[state]

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
      </div>
    </div>
  )
}

export default WorkerCard

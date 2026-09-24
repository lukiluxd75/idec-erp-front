import { Cpu, Monitor, MonitorOff, MonitorX } from 'lucide-react'

/**
 * The four states a PC can be in, derived from what the backend reports:
 * `reachable` (responde en la red) y `model_available` (tiene el modelo de visión).
 */
export const WORKER_STATES = {
  working: {
    label: 'Trabajando',
    variant: 'accent',
    icon: Cpu,
    iconClass: 'bg-accent-50 text-accent-600 ring-accent-200',
    detail: (worker) => `Digitalizando el trabajo ${worker.current_job_id.slice(0, 8)}`,
  },
  idle: {
    label: 'Disponible',
    variant: 'success',
    icon: Monitor,
    iconClass: 'bg-state-success/10 text-state-success ring-state-success/30',
    detail: () => 'Libre, esperando trabajos',
  },
  noModel: {
    label: 'Sin modelo',
    variant: 'warning',
    icon: MonitorX,
    iconClass: 'bg-state-amber/10 text-state-amber ring-state-amber/30',
    detail: () => 'Responde, pero le falta el modelo de visión',
  },
  offline: {
    label: 'Desconectada',
    variant: 'neutral',
    icon: MonitorOff,
    iconClass: 'bg-slate-100 text-slate-400 ring-slate-200',
    detail: () => 'No responde: apagada o fuera de la red',
  },
}

export function workerState(worker) {
  if (!worker.reachable) return 'offline'
  if (!worker.model_available) return 'noModel'
  return worker.current_job_id ? 'working' : 'idle'
}

/** "http://172.16.0.11:11434" -> "172.16.0.11:11434" */
export function hostLabel(host) {
  return String(host || '').replace(/^https?:\/\//, '')
}

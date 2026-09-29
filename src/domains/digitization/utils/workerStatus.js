import { Cpu, Monitor, MonitorOff, MonitorX } from 'lucide-react'

/**
 * The four states a PC can be in, derived from what the backend reports:
 * `reachable` (responde en la red) y `model_available` (tiene el modelo de visión).
 */
/** `used_by` as the backend reports it (the domain that took the PC). */
const USED_BY_LABELS = {
  digitization: 'Administrador de servidores de visión por computadora',
  folios: 'Detector de Folios',
  chatbot: 'Asistente de Trámites',
}

/** Who is using the PC, in words. Falls back to the raw name the backend sent. */
export function usedByLabel(worker) {
  return USED_BY_LABELS[worker?.used_by] || worker?.used_by || 'otro módulo'
}

function workingDetail(worker) {
  if (worker.current_job_id) return `Digitalizando el trabajo ${worker.current_job_id.slice(0, 8)}`
  return `En uso por ${usedByLabel(worker)}`
}

export const WORKER_STATES = {
  working: {
    label: 'Trabajando',
    variant: 'accent',
    icon: Cpu,
    iconClass: 'bg-accent-50 text-accent-600 ring-accent-200',
    detail: workingDetail,
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
  if (worker.used_by) return 'working'
  if (!worker.model_available) return 'noModel'
  return 'idle'
}

/** "http://172.16.0.11:11434" -> "172.16.0.11:11434" */
export function hostLabel(host) {
  return String(host || '').replace(/^https?:\/\//, '')
}

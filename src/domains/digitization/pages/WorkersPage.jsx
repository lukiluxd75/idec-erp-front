import { MonitorCog, MonitorOff, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { digitizationApi } from '@/domains/digitization/api/digitization.api'
import { WorkerCard } from '@/domains/digitization/components/WorkerCard'
import { workerState } from '@/domains/digitization/utils/workerStatus'
import { Alert, Button, Card, EmptyState, SectionHeader, Spinner } from '@/shared/ui'

const POLL_MS = 5000

/**
 * Live monitor of the architects' PCs that run the vision model. The backend
 * probes each one on every request, so the screen just re-asks periodically.
 */
export default function WorkersPage() {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)

  // `loading` only covers the first load; the periodic refresh is silent.
  const refresh = useCallback(
    () =>
      digitizationApi
        .listWorkers()
        .then((data) => {
          setWorkers(data)
          setUpdatedAt(new Date())
          setError(null)
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    []
  )

  useEffect(() => {
    refresh()
    const timer = setInterval(() => {
      if (!document.hidden) refresh()
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  const stats = useMemo(() => {
    const states = workers.map(workerState)
    return {
      total: workers.length,
      connected: states.filter((s) => s !== 'offline').length,
      working: states.filter((s) => s === 'working').length,
      available: states.filter((s) => s === 'idle').length,
    }
  }, [workers])

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={MonitorCog}
        eyebrow="Digitalización IA"
        title="Computadoras conectadas"
        subtitle="Equipos de los arquitectos que procesan las digitalizaciones. Se actualiza solo cada pocos segundos."
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={refresh}>
            Actualizar
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : workers.length === 0 ? (
        <EmptyState
          icon={MonitorOff}
          title="No hay computadoras configuradas"
          subtitle="Registre las direcciones de los equipos en DIGITIZATION_WORKER_URLS del backend y van a aparecer aquí."
        />
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <StatTile label="Conectadas" value={`${stats.connected} de ${stats.total}`} />
            <StatTile label="Trabajando" value={stats.working} />
            <StatTile label="Disponibles" value={stats.available} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {workers.map((worker) => (
              <WorkerCard key={worker.host} worker={worker} />
            ))}
          </div>

          {updatedAt && (
            <p className="mt-4 text-xs text-slate-400">
              Última actualización: {updatedAt.toLocaleTimeString('es-BO')}
            </p>
          )}
        </>
      )}
    </Card>
  )
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-xs">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-slate-900">{value}</p>
    </div>
  )
}

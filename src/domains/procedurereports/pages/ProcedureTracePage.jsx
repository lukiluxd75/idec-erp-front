import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Route } from 'lucide-react'
import { Alert, Button, Card, SectionHeader, Spinner } from '@/shared/ui'
import './ReportsPage.css'
import { reportsApi } from '../api/reports.api'
import { ReportHelpHint, ReportModuleGuide } from '../components/ReportHelp'

export default function ProcedureTracePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [procedureNumber, setProcedureNumber] = useState(() => searchParams.get('nro') || '')
  const [stallDays, setStallDays] = useState('5')
  const [submittedNro, setSubmittedNro] = useState(() => searchParams.get('nro') || '')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const queryKey = useMemo(() => `${submittedNro}|${stallDays}`, [submittedNro, stallDays])

  useEffect(() => {
    const nro = submittedNro.trim()
    if (!nro) {
      setData(null)
      return
    }

    setLoading(true)
    setError('')
    const ac = new AbortController()
    reportsApi
      .fetchTrace(
        {
          procedureNumber: Number(nro),
          stallThresholdDays: Number(stallDays) || 5,
        },
        ac.signal
      )
      .then((trace) => setData(trace))
      .catch((err) => {
        if (ac.signal.aborted) return
        setError(err.message || 'No se pudo cargar la traza')
        setData(null)
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })
    return () => ac.abort()
  }, [queryKey, submittedNro, stallDays])

  function onSearch(e) {
    e.preventDefault()
    const nro = procedureNumber.trim()
    setSubmittedNro(nro)
    if (nro) setSearchParams({ nro })
    else setSearchParams({})
  }

  const proc = data?.procedure
  const summary = data?.summary

  return (
    <div className="procedure-reports animate-card-in space-y-6">
      <Card className="report-shell">
        <SectionHeader
          icon={Route}
          eyebrow="Reportes"
          title="Traza del trámite"
          subtitle="Recorrido por unidades con tiempos de espera y de atención. Las etapas resaltadas superan el umbral de demora configurado."
          actions={<ReportHelpHint helpId="procedureTrace" label="¿Cómo leer la traza?" />}
        />

        <ReportModuleGuide moduleKey="procedureTrace" />

        <form className="filters-bar trace-search" onSubmit={onSearch}>
          <label className="field field-grow">
            Número de trámite
            <input
              value={procedureNumber}
              onChange={(e) => setProcedureNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej. 2026033575"
              autoComplete="off"
            />
          </label>
          <label>
            Umbral trancamiento (días)
            <input
              type="number"
              min={1}
              max={90}
              value={stallDays}
              onChange={(e) => setStallDays(e.target.value)}
            />
          </label>
          <Button type="submit" variant="primary">
            Buscar
          </Button>
        </form>

        {error ? <Alert type="error" message={error} className="mt-4" /> : null}
        {loading ? (
          <div className="report-loading">
            <Spinner />
          </div>
        ) : null}

        {proc && summary && !loading ? (
          <div className="report-body">
            <div className="trace-header">
              <div>
                <strong>Trámite {proc.procedureNumber}</strong>
                <p className="caption">
                  {proc.type || 'Tipo no indicado'}
                  {proc.cadastralCode ? ` · CC ${proc.cadastralCode}` : ''}
                </p>
              </div>
              <div className="trace-summary-pills">
                <span>{summary.steps} etapas</span>
                <span>Duración total: {summary.totalDurationLabel}</span>
                {summary.bottleneckSequenceId ? (
                  <span>
                    Mayor espera antes de etapa {summary.bottleneckSequenceId}: {summary.bottleneckWaitLabel}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="table-scroll">
              <table className="report-table trace-table">
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th>Unidad</th>
                    <th>Funcionario</th>
                    <th>Ingreso</th>
                    <th>Salida</th>
                    <th>Espera previa</th>
                    <th>Tiempo en unidad</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.steps || []).map((step) => (
                    <tr
                      key={step.sequenceId}
                      className={step.stall ? 'warn' : step.openInUnit ? 'pending-row' : ''}
                    >
                      <td>{step.sequenceId}</td>
                      <td>{step.unitName}</td>
                      <td>{step.staffName}</td>
                      <td>{step.receivedAt}</td>
                      <td>{step.openInUnit ? 'En curso' : step.completedAt}</td>
                      <td>{step.waitLabel}</td>
                      <td>
                        {step.openInUnit && step.ageDays != null
                          ? `${step.ageDays} d (abierto)`
                          : step.handlingLabel}
                      </td>
                      <td>{step.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!loading && !proc && !error ? (
          <p className="caption report-note">Indique el número de trámite y pulse Buscar.</p>
        ) : null}
      </Card>
    </div>
  )
}

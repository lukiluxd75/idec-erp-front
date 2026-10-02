import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GitBranch } from 'lucide-react'
import { Alert, Card, SectionHeader, Spinner } from '@/shared/ui'
import './ReportsPage.css'
import { reportsApi, fmt } from '../api/reports.api'
import { ReportHelpHint, ReportModuleGuide } from '../components/ReportHelp'

function monthRange() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const last = new Date(y, m, 0).getDate()
  const pad = (n) => String(n).padStart(2, '0')
  return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(last)}` }
}

export default function MassForwardingPage() {
  const range = monthRange()
  const [startDate, setStartDate] = useState(range.start)
  const [endDate, setEndDate] = useState(range.end)
  const [maxMinutes, setMaxMinutes] = useState('3')
  const [minDispatches, setMinDispatches] = useState('50')
  const [staffName, setStaffName] = useState('')
  const [staffNameExact, setStaffNameExact] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const reqId = useRef(0)

  useEffect(() => {
    setLoading(true)
    const ac = new AbortController()
    const id = ++reqId.current
    setError('')
    reportsApi
      .fetchMassForwarding(
        startDate,
        endDate,
        {
          maxMinutes: Number(maxMinutes) || 3,
          minDispatches: Number(minDispatches) || 50,
          staffName: staffName.trim() || undefined,
          staffNameExact,
        },
        ac.signal
      )
      .then((report) => {
        if (id !== reqId.current) return
        setData(report)
      })
      .catch((err) => {
        if (ac.signal.aborted) return
        setError(err.message || 'Error al cargar')
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false)
      })
    return () => ac.abort()
  }, [startDate, endDate, maxMinutes, minDispatches, staffName, staffNameExact])

  const unitName = data?.meta?.unit

  return (
    <div className="procedure-reports animate-card-in space-y-6">
      <Card className={`report-shell ${loading ? 'is-loading' : ''}`}>
        <SectionHeader
          icon={GitBranch}
          eyebrow="Reportes"
          title="Derivación masiva y posibles adelantos"
          subtitle={
            unitName
              ? `${unitName} · salidas muy rápidas en recepción/despacho (señales para auditoría, no sanción automática).`
              : 'Salidas muy rápidas en recepción/despacho.'
          }
          actions={<ReportHelpHint helpId="massForwarding" label="¿Cómo interpretarlo?" />}
        />

        <ReportModuleGuide moduleKey="massForwarding" />

        <div className="filters-bar">
          <label>
            Desde
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label>
            Hasta
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <label>
            Máx. minutos en bandeja
            <input
              type="number"
              min={1}
              max={120}
              value={maxMinutes}
              onChange={(e) => setMaxMinutes(e.target.value)}
            />
          </label>
          <label>
            Mín. despachos por persona
            <input
              type="number"
              min={1}
              value={minDispatches}
              onChange={(e) => setMinDispatches(e.target.value)}
            />
          </label>
          <label className="field field-grow">
            Funcionario (nombre completo)
            <input
              type="search"
              placeholder="Ej. Juan Pérez López"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="chip filter-chip">
            <input
              type="checkbox"
              checked={staffNameExact}
              onChange={(e) => setStaffNameExact(e.target.checked)}
            />
            Coincidencia exacta de nombre
          </label>
        </div>

        {data?.meta?.note ? <p className="caption report-note">{data.meta.note}</p> : null}
        {error ? <Alert type="error" message={error} className="mt-4" /> : null}
        {loading ? (
          <div className="report-loading">
            <Spinner />
          </div>
        ) : null}

        {!loading && data ? (
          <div className="report-body space-y-8">
            <section className="report-section">
              <h3 className="report-section-title">Ranking por funcionario</h3>
              {(data.staff || []).length === 0 ? (
                <p className="caption">No hay registros con los umbrales actuales.</p>
              ) : (
                <div className="table-scroll">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Funcionario</th>
                        <th>Despachos</th>
                        <th>Rápidos (≤ umbral)</th>
                        <th>% rápidos</th>
                        <th>Prom. minutos</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {data.staff.map((row) => (
                        <tr key={row.name} className={row.rapidSharePct >= 70 ? 'warn' : ''}>
                          <td>{row.name}</td>
                          <td>{fmt(row.dispatches)}</td>
                          <td>{fmt(row.rapidDispatches)}</td>
                          <td>{row.rapidSharePct}%</td>
                          <td>{row.avgMinutes ?? '—'}</td>
                          <td>
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => {
                                setStaffName(row.name)
                                setStaffNameExact(true)
                              }}
                            >
                              Ver casos
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="report-section">
              <h3 className="report-section-title">Casos más rápidos</h3>
              {(data.cases || []).length === 0 ? (
                <p className="caption">Sin casos en el período con el filtro actual.</p>
              ) : (
                <div className="table-scroll">
                  <table className="report-table compact">
                    <thead>
                      <tr>
                        <th>Trámite</th>
                        <th>Funcionario</th>
                        <th>Minutos</th>
                        <th>Salida</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {data.cases.map((row) => (
                        <tr key={`${row.procedureNumber}-${row.completedAt}-${row.staffName}`}>
                          <td>{row.procedureNumber}</td>
                          <td>{row.staffName}</td>
                          <td>{row.minutes}</td>
                          <td>{row.completedAt}</td>
                          <td>
                            <Link
                              className="text-link"
                              to={`/procedurereports/traza-tramite?nro=${row.procedureNumber}`}
                            >
                              Traza
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </Card>
    </div>
  )
}

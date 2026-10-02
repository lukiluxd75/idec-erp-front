import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gauge, BarChart3, GitBranch, Route } from 'lucide-react'
import { Alert, Card, SectionHeader, Spinner } from '@/shared/ui'
import './ReportsPage.css'
import { reportsApi, fmt } from '../api/reports.api'
import { BacklogAgingChart } from '../components/BacklogAgingChart'
import { ReportHelpHint, ReportModuleGuide } from '../components/ReportHelp'

const DEFAULT_PROCEDURE_TYPES = [2009, 2010, 2012, 3002, 3003, 3004, 3005, 3006]

function monthRange() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const last = new Date(y, m, 0).getDate()
  const pad = (n) => String(n).padStart(2, '0')
  return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(last)}` }
}

const QUICK_LINKS = [
  {
    to: '/procedurereports/gerencial',
    icon: BarChart3,
    title: 'Reporte gerencial',
    text: 'Análisis completo de productividad, SLA y pendientes por persona.',
  },
  {
    to: '/procedurereports/derivacion-masiva',
    icon: GitBranch,
    title: 'Derivación masiva',
    text: 'Funcionarios de recepción/despacho con muchas salidas en pocos minutos.',
  },
  {
    to: '/procedurereports/traza-tramite',
    icon: Route,
    title: 'Traza del trámite',
    text: 'Recorrido etapa por etapa para ver dónde se detiene un trámite.',
  },
]

export default function PanelPage() {
  const range = monthRange()
  const [startDate, setStartDate] = useState(range.start)
  const [endDate, setEndDate] = useState(range.end)
  const [districtId, setDistrictId] = useState('7')
  const [districts, setDistricts] = useState([])
  const [unitLabel, setUnitLabel] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const reqId = useRef(0)

  useEffect(() => {
    reportsApi
      .fetchFilters()
      .then((f) => {
        setDistricts(f.districts || [])
        setUnitLabel(f.unit || '')
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    setLoading(true)
    const ac = new AbortController()
    const id = ++reqId.current
    setError('')
    reportsApi
      .fetchPanel(startDate, endDate, districtId, DEFAULT_PROCEDURE_TYPES, ac.signal)
      .then((panel) => {
        if (id !== reqId.current) return
        setData(panel)
      })
      .catch((err) => {
        if (ac.signal.aborted) return
        setError(err.message || 'Error al cargar')
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false)
      })
    return () => ac.abort()
  }, [startDate, endDate, districtId])

  const kpis = data?.kpis

  return (
    <div className="procedure-reports animate-card-in space-y-6">
      <Card className={`report-shell ${loading ? 'is-loading' : ''}`}>
        <SectionHeader
          icon={Gauge}
          eyebrow="Reportes"
          title="Panel de indicadores"
          subtitle={
            unitLabel
              ? `${unitLabel} · vista resumida del módulo (cartografía). Elija fechas y comuna para actualizar.`
              : 'Vista resumida del módulo de reportes de trámites en bandeja.'
          }
          actions={<ReportHelpHint helpId="panel" label="¿Qué muestra este panel?" />}
        />

        <ReportModuleGuide moduleKey="panel" />

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
            Comuna
            <select value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
              <option value="0">Todas</option>
              {districts.map((d) => (
                <option key={d.districtId} value={String(d.districtId)}>
                  {d.description} ({d.count})
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <Alert type="error" message={error} className="mt-4" /> : null}
        {loading ? (
          <div className="report-loading">
            <Spinner />
          </div>
        ) : null}

        {!loading && kpis ? (
          <div className="report-body">
            <section className="kpis kpis-extended">
              <div className="kpi">
                <b>{fmt(kpis.dispatches)}</b>
                <span>Despachos en el período</span>
              </div>
              <div className="kpi">
                <b>{fmt(kpis.procedures)}</b>
                <span>Trámites distintos</span>
              </div>
              <div className="kpi">
                <b>{fmt(kpis.pendingCount)}</b>
                <span>Pendientes hoy en bandeja</span>
              </div>
              <div className="kpi">
                <b>{kpis.slaAvgDays ?? '—'}</b>
                <span>SLA promedio (días)</span>
              </div>
            </section>

            <div className="panel-two-col">
              <section className="report-section">
                <h3 className="report-section-title">Antigüedad de pendientes</h3>
                <BacklogAgingChart backlogAging={data.backlogAging} />
              </section>
              <section className="report-section">
                <h3 className="report-section-title">Pendientes más antiguos</h3>
                {(data.criticalPending || []).length === 0 ? (
                  <p className="caption">No hay pendientes críticos con el filtro actual.</p>
                ) : (
                  <div className="table-scroll">
                    <table className="report-table compact">
                      <thead>
                        <tr>
                          <th>Trámite</th>
                          <th>Tipo</th>
                          <th>Días</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {data.criticalPending.map((row) => (
                          <tr key={String(row.procedureNumber)}>
                            <td>{row.procedureNumber}</td>
                            <td>{row.type || '—'}</td>
                            <td>{row.ageDays}</td>
                            <td>
                              <Link
                                className="text-link"
                                to={`/procedurereports/traza-tramite?nro=${row.procedureNumber}`}
                              >
                                Ver traza
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

            <section className="report-section">
              <h3 className="report-section-title">Otras funciones del módulo</h3>
              <div className="panel-quick-links">
                {QUICK_LINKS.map((item) => (
                  <Link key={item.to} to={item.to} className="panel-quick-card">
                    <item.icon size={22} aria-hidden />
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </Card>
    </div>
  )
}

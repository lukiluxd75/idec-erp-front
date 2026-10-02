import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, FileDown, FileSpreadsheet } from 'lucide-react'
import { Alert, Button, Card, SectionHeader, Spinner } from '@/shared/ui'
import './ReportsPage.css'
import { reportsApi, fmt, avg } from '../api/reports.api'
import { RankingChart } from '../components/RankingChart'
import { DailyChart } from '../components/DailyChart'
import { TypePieChart } from '../components/TypePieChart'
import { TypeStaffMatrix } from '../components/TypeStaffMatrix'
import { Collapse } from '../components/Collapse'
import { ExecutivePanel } from '../components/ExecutivePanel'
import { SlaPanel, SlaByTypeTable, SlaByStaffTable } from '../components/SlaPanel'
import { BacklogAgingChart } from '../components/BacklogAgingChart'
import { DistrictComparisonTable } from '../components/DistrictComparisonTable'
import { ProcedureGroupStrip } from '../components/ProcedureGroupStrip'

const DEFAULT_PROCEDURE_TYPES = [2009, 2010, 2012, 3002, 3003, 3004, 3005, 3006]

/** Row highlight thresholds -- exact port of the standalone project's rowClass. */
function rowClass(r, threshold) {
  if (r.pending >= 100) return 'warn'
  if (r.dispatches === 0) return 'zero'
  if (threshold && r.dispatches >= threshold) return 'ok'
  return ''
}

/** Reporte gerencial de trámites (cartografía). Vive dentro del AppShell del ERP. */
export default function ReportsPage() {
  const [startDate, setStartDate] = useState('2026-08-01')
  const [endDate, setEndDate] = useState('2026-08-31')
  const [districtId, setDistrictId] = useState('7')
  const [procedureTypeIds, setProcedureTypeIds] = useState(DEFAULT_PROCEDURE_TYPES)
  const [districts, setDistricts] = useState([])
  const [procedureTypesCatalog, setProcedureTypesCatalog] = useState([])
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState('')
  const typesKey = procedureTypeIds.slice().sort((a, b) => a - b).join(',')
  const reqId = useRef(0)

  useEffect(() => {
    reportsApi
      .fetchFilters()
      .then((f) => {
        setDistricts(f.districts || [])
        setProcedureTypesCatalog(f.procedureTypes || [])
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    setLoading(true)
    const ac = new AbortController()
    const id = ++reqId.current
    const timer = setTimeout(
      () => {
        setError('')
        reportsApi
          .fetchReport(startDate, endDate, districtId, procedureTypeIds, ac.signal)
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
      },
      districtId ? 120 : 280
    )
    return () => {
      clearTimeout(timer)
      ac.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, districtId, typesKey])

  async function onExport(kind) {
    setExporting(kind)
    setError('')
    try {
      await reportsApi.downloadExport(kind, startDate, endDate, districtId, procedureTypeIds)
    } catch (err) {
      setError(err.message || 'No se pudo descargar')
    } finally {
      setExporting('')
    }
  }

  function toggleType(id) {
    setProcedureTypeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const allTypes = procedureTypeIds.length === 0
  const daysQ1 = data?.teamDaily.filter((d) => Number(d.date.slice(8, 10)) <= 15) ?? []
  const daysQ2 = data?.teamDaily.filter((d) => Number(d.date.slice(8, 10)) >= 16) ?? []
  const withMovement = data?.ranking.filter((r) => r.dispatches > 0) ?? []
  const coreThreshold = data?.ranking[0] ? data.ranking[0].dispatches * 0.7 : 0
  const pendingTable = data?.ranking.slice().sort((a, b) => b.pending - a.pending) ?? []
  const groups = useMemo(() => {
    const map = new Map()
    for (const t of procedureTypesCatalog) {
      const list = map.get(t.group) || []
      list.push(t)
      map.set(t.group, list)
    }
    return [...map.entries()]
  }, [procedureTypesCatalog])
  const districtLabel =
    districtId === '0'
      ? 'todas las comunas'
      : districts.find((d) => String(d.districtId) === districtId)?.description || data?.meta.district || 'la comuna'

  function cell(name, dateIso) {
    const n = data?.staffDaily.find((x) => x.name === name && x.date === dateIso)?.dispatches
    return n ? String(n) : ''
  }

  return (
    <div className="procedure-reports animate-card-in space-y-6">
      <Card className={`report-shell ${loading ? 'is-loading' : ''}`}>
        <SectionHeader
          icon={BarChart3}
          eyebrow="Reportes"
          title="Reporte gerencial · Cartografía"
          subtitle="Dirección de Administración Geográfica y Catastro · productividad, SLA y backlog."
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={FileSpreadsheet}
                disabled={!!exporting || !data || loading}
                loading={exporting === 'excel'}
                onClick={() => onExport('excel')}
              >
                Excel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={FileDown}
                disabled={!!exporting || !data || loading}
                loading={exporting === 'pdf'}
                onClick={() => onExport('pdf')}
              >
                PDF
              </Button>
            </>
          }
        />

        <div className="filters-bar">
          <label className="field">
            <span>Desde</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Hasta</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <label className="field field-grow">
            <span>Comuna</span>
            <select value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
              <option value="0">Todas las comunas</option>
              {districts.length === 0 && <option value="7">CATASTRO CENTRAL</option>}
              {districts.map((d) => (
                <option key={d.districtId} value={String(d.districtId)}>
                  {d.description} ({d.count})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="tipos">
          <span>Tipos de trámite · {districtLabel}</span>
          <label className={allTypes ? 'chip on' : 'chip'}>
            <input
              type="checkbox"
              checked={allTypes}
              onChange={(e) => setProcedureTypeIds(e.target.checked ? [] : DEFAULT_PROCEDURE_TYPES)}
            />
            Todos los tipos
          </label>
          {groups.map(([group, items]) => (
            <div key={group} className="tipo-grupo">
              <b>{group}</b>
              <div className="tipo-grupo-chips">
                {items.map((t) => {
                  const on = procedureTypeIds.includes(t.procedureTypeId)
                  return (
                    <label key={t.procedureTypeId} className={on && !allTypes ? 'chip on' : 'chip'}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          if (allTypes) setProcedureTypeIds([t.procedureTypeId])
                          else toggleType(t.procedureTypeId)
                        }}
                      />
                      <i className="swatch" style={{ background: t.color }} />
                      {t.label}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {error && <Alert type="error" className="mt-4" message={error} />}

        <div className="report-body">
          {loading && (
            <div className="loader-overlay" role="status" aria-live="polite">
              <Spinner className="h-10 w-10 text-brand-800" />
              <strong>Cargando {districtLabel}</strong>
              <span>Actualizando tablas y gráficos…</span>
            </div>
          )}

          {data && (
            <>
              <ExecutivePanel analysis={data.analysis} />

              <section className="kpis kpis-extended">
                <div className="kpi">
                  <b>{fmt(data.kpis.dispatches)}</b>
                  <span>Salidas de bandeja</span>
                </div>
                <div className="kpi">
                  <b>{fmt(data.kpis.procedures)}</b>
                  <span>Trámites distintos</span>
                </div>
                <div className="kpi">
                  <b>{fmt(data.kpis.avgTeamPerDay, 1)}</b>
                  <span>Equipo / día hábil</span>
                </div>
                <div className="kpi">
                  <b>
                    {data.sla?.summary?.avgDays != null ? fmt(data.sla.summary.avgDays, 1) : '—'}
                  </b>
                  <span>SLA prom. (días)</span>
                </div>
                <div className="kpi warn">
                  <b>{fmt(data.kpis.pendingCount)}</b>
                  <span>Pendientes actuales</span>
                </div>
                <div className="kpi">
                  <b>{fmt(data.kpis.staffCount)}</b>
                  <span>Funcionarios · {data.meta.district}</span>
                </div>
              </section>

              <SlaPanel sla={data.sla} periodComparison={data.periodComparison} kpis={data.kpis} />

              <ProcedureGroupStrip groups={data.procedureGroups} totalDispatches={data.kpis.dispatches} />

              {data.analysis?.backlog && <div className="banner">{data.analysis.backlog}</div>}

              <section className="grid-2">
                <div className="panel">
                  <h2>Antigüedad del backlog</h2>
                  <p className="caption">Pendientes por días desde el ingreso a bandeja (hoy).</p>
                  <BacklogAgingChart backlogAging={data.backlogAging} />
                </div>
                <div className="panel">
                  <h2>Comparativa por comuna</h2>
                  <p className="caption">Visible al filtrar todas las comunas o varias áreas.</p>
                  <DistrictComparisonTable
                    rows={data.districtComparison}
                    show={districtId === '0' || (data.districtComparison?.length ?? 0) > 1}
                  />
                  {districtId !== '0' && (data.districtComparison?.length ?? 0) <= 1 && (
                    <p className="caption">Seleccione «Todas las comunas» para ver el cuadro comparativo.</p>
                  )}
                </div>
              </section>

              <Collapse title="SLA por tipo de trámite" caption="Promedio de días ingreso → salida en el período">
                <SlaByTypeTable rows={data.sla?.byType} />
              </Collapse>

              <Collapse title="SLA por funcionario" caption="Mínimo 3 salidas en el período">
                <SlaByStaffTable rows={data.sla?.byStaff} />
              </Collapse>

              <Collapse
                title="Pendientes críticos (más antiguos)"
                caption={`${fmt(data.criticalPending?.length ?? 0)} trámites`}
              >
                <div className="table-wrap tall">
                  <table>
                    <thead>
                      <tr>
                        <th>Trámite</th>
                        <th>Tipo</th>
                        <th>Funcionario</th>
                        <th className="num">Días</th>
                        <th>Ingreso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.criticalPending || []).map((p) => (
                        <tr key={p.procedureId} className={p.ageDays >= 60 ? 'warn' : ''}>
                          <td>
                            {p.procedureNumber != null ? `${p.procedureNumber}/${p.year ?? ''}` : p.procedureId}
                          </td>
                          <td>{p.type}</td>
                          <td>{p.name}</td>
                          <td className="num">{fmt(p.ageDays)}</td>
                          <td>{p.receivedAt || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Collapse>

              <section className="block">
                <h2>Colores por funcionario</h2>
                <p className="caption">Misma paleta en ranking, ritmo diario y torta por tipo.</p>
                <div className="color-legend">
                  {data.ranking.map((r) => (
                    <div key={r.name} className="legend-item">
                      <span className="swatch lg" style={{ background: r.color }} />
                      <span>{r.name}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid-2">
                <div className="panel">
                  <h2>Ranking de despachos</h2>
                  <p className="caption">
                    {data.meta.startDate} a {data.meta.endDate} · {data.meta.district}
                  </p>
                  <RankingChart ranking={data.ranking} />
                </div>
                <div className="panel">
                  <h2>Ritmo del equipo por día</h2>
                  <p className="caption">
                    Cada color es un funcionario. Línea = promedio hábil ({fmt(data.kpis.avgTeamPerDay, 1)})
                  </p>
                  <DailyChart
                    days={data.teamDaily}
                    ranking={data.ranking}
                    staffDaily={data.staffDaily}
                    average={data.kpis.avgTeamPerDay}
                  />
                </div>
              </section>

              <section className="block">
                <div className="panel pie-panel">
                  <h2>Trámites por tipo</h2>
                  <p className="caption">El tamaño es la cantidad de salidas del período.</p>
                  <div className="pie-layout">
                    <TypePieChart byType={data.byType} />
                    <ul className="pie-list">
                      {data.byType.map((t) => (
                        <li key={t.procedureTypeId}>
                          <span className="swatch" style={{ background: t.color }} />
                          {t.description}
                          <b>{fmt(t.dispatches)}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              <Collapse
                title="Despachos por tipo y funcionario"
                caption={`${fmt(data.typeStaffMatrix.rows.length)} funcionarios`}
              >
                <TypeStaffMatrix matrix={data.typeStaffMatrix} />
              </Collapse>

              <Collapse title="Estimado por persona" caption="Ritmo real sobre los días con salida">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th className="num">Despachos</th>
                        <th className="num">Trámites</th>
                        <th className="num">Días</th>
                        <th className="num">Por día que despachó</th>
                        <th className="num">Sobre {data.kpis.workingDays} hábiles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.ranking.map((r) => (
                        <tr key={r.name} className={rowClass(r, coreThreshold)}>
                          <td>{r.name}</td>
                          <td className="num">{r.dispatches}</td>
                          <td className="num">{r.procedures}</td>
                          <td className="num">{r.days}</td>
                          <td className="num">{avg(r.dispatches, r.days)}</td>
                          <td className="num">{avg(r.dispatches, data.kpis.workingDays)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Collapse>

              <Collapse title="Tabla de pendientes" caption="Bandeja al momento de generar el reporte">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th className="num">Pendientes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTable.map((r) => (
                        <tr key={r.name} className={rowClass(r, coreThreshold)}>
                          <td>{r.name}</td>
                          <td className="num">{r.pending}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Collapse>

              <Collapse title="Detalle día por persona · primera quincena">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        {daysQ1.map((d) => (
                          <th key={d.date} className="num">
                            {d.date.slice(8)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {withMovement.map((r) => (
                        <tr key={r.name}>
                          <td>{r.name}</td>
                          {daysQ1.map((d) => (
                            <td key={d.date} className="num">
                              {cell(r.name, d.date)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Collapse>

              <Collapse title="Detalle día por persona · segunda quincena">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        {daysQ2.map((d) => (
                          <th key={d.date} className="num">
                            {d.date.slice(8)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {withMovement.map((r) => (
                        <tr key={r.name}>
                          <td>{r.name}</td>
                          {daysQ2.map((d) => (
                            <td key={d.date} className="num">
                              {cell(r.name, d.date)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Collapse>

              <p className="status">
                {data.meta.unit} · {data.meta.district} · {data.kpis.staffCount} funcionarios activos · generado{' '}
                {data.meta.generatedAt}
              </p>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

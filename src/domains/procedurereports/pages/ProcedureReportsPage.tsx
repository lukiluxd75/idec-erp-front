import { useEffect, useMemo, useRef, useState } from "react";
import { Collapse, DailyChart, RankingChart, ProcedureTypeStaffMatrix, ProcedureTypeChart, getRowClass } from "../components/ReportCharts";
import { avg, downloadExport, fetchFilters, fetchReport, fmt, type District, type ProcedureReport, type ProcedureType } from "../api/procedureReports.api";

const DEFAULT_PROCEDURE_TYPES = [2009, 2010, 2012, 3002, 3003, 3004, 3005, 3006];

export default function ProcedureReportsPage() {
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-31");
  const [district, setDistrict] = useState("7");
  const [procedureTypes, setProcedureTypes] = useState<number[]>(DEFAULT_PROCEDURE_TYPES);
  const [districts, setDistricts] = useState<District[]>([]);
  const [procedureTypeOptions, setProcedureTypeOptions] = useState<ProcedureType[]>([]);
  const [data, setData] = useState<ProcedureReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const procedureTypesKey = procedureTypes.slice().sort((a, b) => a - b).join(",");
  const requestId = useRef(0);

  useEffect(() => {
    void fetchFilters()
      .then((f) => {
        setDistricts(f.districts);
        setProcedureTypeOptions(f.procedureTypes);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    const ac = new AbortController();
    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      setError("");
      void fetchReport(startDate, endDate, district, procedureTypes, ac.signal)
        .then((reporte) => {
          if (id !== requestId.current) return;
          setData(reporte);
        })
        .catch((err: unknown) => {
          if (ac.signal.aborted) return;
          setError(err instanceof Error ? err.message : "Error al cargar");
        })
        .finally(() => {
          if (id === requestId.current) setLoading(false);
        });
    }, district ? 120 : 280);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [startDate, endDate, district, procedureTypesKey]);

  async function handleExport(kind: "excel" | "pdf") {
    setExporting(kind);
    setError("");
    try {
      await downloadExport(kind, startDate, endDate, district, procedureTypes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar");
    } finally {
      setExporting("");
    }
  }

  function toggleProcedureType(id: number) {
    setProcedureTypes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const allProcedureTypes = procedureTypes.length === 0;
  const firstHalfDays = data?.teamDaily.filter((d) => Number(d.date.slice(8, 10)) <= 15) ?? [];
  const secondHalfDays = data?.teamDaily.filter((d) => Number(d.date.slice(8, 10)) >= 16) ?? [];
  const activeStaff = data?.ranking.filter((r) => r.dispatches > 0) ?? [];
  const coreThreshold = data?.ranking[0] ? data.ranking[0].dispatches * 0.7 : 0;
  const pendingRows = data?.ranking.slice().sort((a, b) => b.pending - a.pending) ?? [];
  const groups = useMemo(() => {
    const map = new Map<string, ProcedureType[]>();
    for (const t of procedureTypeOptions) {
      const list = map.get(t.group) || [];
      list.push(t);
      map.set(t.group, list);
    }
    return [...map.entries()];
  }, [procedureTypeOptions]);
  const districtLabel =
    district === "0"
      ? "todas las comunas"
      : districts.find((c) => String(c.districtId) === district)?.description || data?.meta.district || "la comuna";

  function cell(name: string, dateIso: string) {
    const n = data?.staffDaily.find((x) => x.name === name && x.date === dateIso)?.dispatches;
    return n ? String(n) : "";
  }

  return (
    <div className="app">
      <div className={`sheet ${loading ? "is-loading" : ""}`}>
        <header className="brand">
          <div className="pill">Reporte gerencial</div>
          <h1>Dirección de Administración Geográfica y Catastro</h1>
          <h2>Área Técnica Cartografía · salidas de bandeja y pendientes</h2>
          <div className="controls">
            <label className="field">
              <span>Desde</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="field">
              <span>Hasta</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
            <label className="field">
              <span>Comuna</span>
              <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                <option value="0">Todas las comunas</option>
                {districts.length === 0 && <option value="7">CATASTRO CENTRAL</option>}
                {districts.map((c) => (
                  <option key={c.districtId} value={String(c.districtId)}>
                    {c.description} ({c.count})
                  </option>
                ))}
              </select>
            </label>
            <button className="btn cyan" type="button" disabled={!!exporting || !data || loading} onClick={() => void handleExport("excel")}>
              {exporting === "excel" ? "Excel…" : "Excel"}
            </button>
            <button className="btn ghost" type="button" disabled={!!exporting || !data || loading} onClick={() => void handleExport("pdf")}>
              {exporting === "pdf" ? "PDF…" : "PDF"}
            </button>
          </div>
          <div className="procedure-types">
            <span>Tipos de trámite · {districtLabel}</span>
            <label className={allProcedureTypes ? "chip on" : "chip"}>
              <input
                type="checkbox"
                checked={allProcedureTypes}
                onChange={(e) => setProcedureTypes(e.target.checked ? [] : DEFAULT_PROCEDURE_TYPES)}
              />
              Todos los tipos
            </label>
            {groups.map(([group, items]) => (
              <div key={group} className="procedure-group">
                <b>{group}</b>
                <div className="procedure-group-chips">
                  {items.map((t) => {
                    const on = procedureTypes.includes(t.procedureTypeId);
                    return (
                      <label key={t.procedureTypeId} className={on && !allProcedureTypes ? "chip on" : "chip"}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => {
                            if (allProcedureTypes) setProcedureTypes([t.procedureTypeId]);
                            else toggleProcedureType(t.procedureTypeId);
                          }}
                        />
                        <i className="swatch" style={{ background: t.color }} />
                        {t.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </header>

        {error && <div className="error">{error}</div>}

        <div className="sheet-body">
        {loading && (
          <div className="loader-overlay" role="status" aria-live="polite">
            <div className="spinner" />
            <strong>Cargando {districtLabel}</strong>
            <span>Actualizando tablas y gráficos…</span>
          </div>
        )}

        {data && (
          <>
            <section className="kpis">
              <div className="kpi">
                <b>{fmt(data.kpis.dispatches)}</b>
                <span>Salidas de bandeja</span>
              </div>
              <div className="kpi">
                <b>{fmt(data.kpis.avgTeamPerDay, 1)}</b>
                <span>Estimado equipo / día hábil</span>
              </div>
              <div className="kpi">
                <b>{fmt(data.kpis.pendingCount)}</b>
                <span>Pendientes actuales</span>
              </div>
              <div className="kpi warn">
                <b>{fmt(data.kpis.staffCount)}</b>
                <span>Funcionarios en {data.meta.district}</span>
              </div>
            </section>

            {data.analysis.backlog && <div className="banner">{data.analysis.backlog}</div>}
            {data.meta.notice && <div className="banner warn">{data.meta.notice}</div>}

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
                  <ProcedureTypeChart data={data.byType} />
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
              <ProcedureTypeStaffMatrix matrix={data.typeStaffMatrix} />
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
                      <tr key={r.name} className={getRowClass(r, coreThreshold)}>
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
                      {pendingRows.map((r) => (
                        <tr key={r.name} className={getRowClass(r, coreThreshold)}>
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
                      {firstHalfDays.map((d) => (
                        <th key={d.date} className="num">{d.date.slice(8)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeStaff.map((r) => (
                      <tr key={r.name}>
                        <td>{r.name}</td>
                        {firstHalfDays.map((d) => (
                          <td key={d.date} className="num">{cell(r.name, d.date)}</td>
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
                      {secondHalfDays.map((d) => (
                        <th key={d.date} className="num">{d.date.slice(8)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeStaff.map((r) => (
                      <tr key={r.name}>
                        <td>{r.name}</td>
                        {secondHalfDays.map((d) => (
                          <td key={d.date} className="num">{cell(r.name, d.date)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Collapse>

            <p className="status">
              {data.meta.unit} · {data.meta.district} · {data.kpis.staffCount} funcionarios activos
              {" · generado "}
              {data.meta.generatedAt}
            </p>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import {
  Building2,
  Cpu,
  Images,
  Info,
  Loader2,
  MapPinned,
  Play,
  RefreshCw,
  Table2,
} from 'lucide-react'
import { Alert, Badge, Button, Card, EmptyState, Select, Spinner } from '@/shared/ui'
import { deteccionApi } from '../api/deteccion.api'
import CompareZoomPanel from '../components/CompareZoomPanel'
import AsientosPanel from '../components/AsientosPanel'
import ManualAlignPanel from '../components/ManualAlignPanel'
import ResultGallery from '../components/ResultGallery'
import DetectionProgressModal from '../components/DetectionProgressModal'

const DetectionMap = lazy(() => import('../components/DetectionMap'))

const POLL_MS = 800

function bboxFromPolygon(ring) {
  if (!ring?.length) return null
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity
  ring.forEach(([lon, lat]) => {
    minLon = Math.min(minLon, lon)
    minLat = Math.min(minLat, lat)
    maxLon = Math.max(maxLon, lon)
    maxLat = Math.max(maxLat, lat)
  })
  return [minLon, minLat, maxLon, maxLat]
}

function findBboxForRow(data, row) {
  if (row.bbox_px?.length === 4) return row.bbox_px.map(Number)
  if (row.bbox?.length === 4) return row.bbox.map(Number)
  const cambios = data?.cambios || []
  const hit = cambios.find(
    (c) =>
      c.tipo === (row.tipo || row.tipo_cambio) &&
      Number(c.prob_pct) === Number(row.prob_pct) &&
      (row.codigo_catastral == null || c.codigo_catastral === row.codigo_catastral)
  )
  const bb = hit && (hit.bbox || hit.bbox_px)
  return bb ? bb.map(Number) : null
}

function tipoBadgeVariant(tipo) {
  const t = String(tipo || '').toLowerCase()
  if (t.includes('nueva')) return 'success'
  if (t.includes('elimin')) return 'danger'
  return 'warning'
}

function FieldGroup({ title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

/**
 * Construction detection workbench — modern ERP layout.
 */
export default function DeteccionPage() {
  const [health, setHealth] = useState(null)
  const [wmsMeta, setWmsMeta] = useState({ layers: [], hosts: [], years: [] })
  const [yearRef, setYearRef] = useState('')
  const [yearMov, setYearMov] = useState('')
  const [basemapYear, setBasemapYear] = useState('2023')
  const [targetGsd, setTargetGsd] = useState('0.30')
  const [minProb, setMinProb] = useState('50')
  const [prediosBuffer, setPrediosBuffer] = useState('10')
  const [gpu, setGpu] = useState(0)
  const [polygon, setPolygon] = useState(null)

  const [jobId, setJobId] = useState(null)
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [metaError, setMetaError] = useState('')
  const [assetUrls, setAssetUrls] = useState({})
  const [selectedRow, setSelectedRow] = useState(null)
  const [alignOpen, setAlignOpen] = useState(false)
  const [showGsdHelp, setShowGsdHelp] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [runStartedAt, setRunStartedAt] = useState(null)

  const pollRef = useRef(null)
  const objectUrlsRef = useRef([])
  const resultsRef = useRef(null)

  const yearOptions = useMemo(() => {
    const layers = wmsMeta.layers || []
    if (layers.length) {
      return layers.map((l) => ({
        value: String(l.year),
        label: l.label || String(l.year),
      }))
    }
    return (wmsMeta.years || []).map((y) => ({ value: String(y), label: String(y) }))
  }, [wmsMeta])

  const reportRows = useMemo(() => {
    const minPct = Number(minProb) || 0
    const rows = result?.reporte_arquitecto || []
    return rows.filter((r) => Number(r.prob_pct || 0) >= minPct - 1e-9)
  }, [result, minProb])

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true)
    setMetaError('')
    try {
      const [h, layers] = await Promise.all([deteccionApi.health(), deteccionApi.listWmsLayers()])
      setHealth(h && typeof h === 'object' ? h : { reachable: false })
      const list = (layers && typeof layers === 'object' ? layers.layers : null) || []
      const ys = (layers?.years || list.map((l) => l.year) || []).filter(Boolean)
      const unique = [...new Set(ys)].sort((a, b) => a - b)
      setWmsMeta({
        layers: list,
        hosts: layers?.hosts || [],
        years: unique,
      })
      if (unique.length) {
        const a = unique.includes(2010) ? 2010 : unique[0]
        const b = unique.includes(2026) ? 2026 : unique[unique.length - 1]
        setYearRef(String(a))
        setYearMov(String(b))
        const prefer = unique.includes(2023)
          ? '2023'
          : String(unique.filter((y) => y !== 2026).slice(-1)[0] || unique[0])
        setBasemapYear(prefer)
      }
    } catch (err) {
      const msg = err.message || 'No se pudo cargar el motor de detección. Intente nuevamente.'
      setMetaError(msg)
      toast.error(msg)
    } finally {
      setLoadingMeta(false)
    }
  }, [])

  useEffect(() => {
    loadMeta()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [loadMeta])

  async function hydrateAssets(payload) {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    objectUrlsRef.current = []
    const urls = payload?.urls || {}
    const keys = ['aligned_a', 'aligned_b', 'resultado', 'panel_resultado', 'align_check', 'orto_ref', 'orto_mov']
    const next = {}
    await Promise.all(
      keys.map(async (key) => {
        const path = urls[key]
        if (!path) return
        try {
          const obj = await deteccionApi.resolveAssetObjectUrl(path)
          objectUrlsRef.current.push(obj)
          next[key] = obj
        } catch {
          /* optional */
        }
      })
    )
    setAssetUrls(next)
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  async function finishWithResult(id) {
    const res = await deteccionApi.getResult(id)
    setResult(res)
    await hydrateAssets(res)
    const level = String(
      res.align_quality?.level || res.resumen_confiabilidad?.align_level || ''
    ).toLowerCase()
    const rows = res?.reporte_arquitecto || []
    if (rows.length) {
      const first = rows[0]
      const bbox = findBboxForRow(res, first)
      setSelectedRow({ ...first, bbox_px: bbox || first.bbox_px || first.bbox })
    }
    if (res.needs_manual_align || level === 'poor' || level === 'bad') {
      setAlignOpen(true)
      toast.warn(
        'La alineación automática es insuficiente. Se recomienda completar la alineación manual.'
      )
    } else {
      toast.success('Detección finalizada correctamente.')
    }
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function pollJob(id) {
    try {
      const prog = await deteccionApi.getProgress(id)
      setProgress(prog)
      const status = (prog.status || '').toLowerCase()
      if (status === 'done' || prog.result_ready) {
        stopPolling()
        setProgress((prev) => ({
          ...(prev || {}),
          ...prog,
          pct: 100,
          step_label: 'Cargando resultados…',
          detail: 'Descargando evidencias del motor GPU.',
        }))
        setCancelling(false)
        try {
          await finishWithResult(id)
        } finally {
          setRunning(false)
          setRunStartedAt(null)
        }
        return
      }
      if (status === 'error' || status === 'cancelled') {
        stopPolling()
        setRunning(false)
        setCancelling(false)
        setRunStartedAt(null)
        toast.warn(
          status === 'cancelled'
            ? 'El proceso se detuvo correctamente.'
            : prog.error || 'Se produjo un error durante la detección.'
        )
      }
    } catch (err) {
      stopPolling()
      setRunning(false)
      setCancelling(false)
      setRunStartedAt(null)
      toast.error(err.message || 'No se pudo consultar el progreso del trabajo.')
    }
  }

  function startPolling(id, initialProgress = null) {
    stopPolling()
    setJobId(id)
    setRunning(true)
    setCancelling(false)
    setRunStartedAt(Date.now())
    if (initialProgress) setProgress(initialProgress)
    pollRef.current = setInterval(() => pollJob(id), POLL_MS)
    pollJob(id)
  }

  async function handleStart() {
    if (!polygon || polygon.length < 4) {
      toast.warn('Dibuje un área (polígono) en el mapa antes de iniciar.')
      return
    }
    if (!yearRef || !yearMov) {
      toast.warn('Seleccione los años de referencia y de comparación.')
      return
    }
    setResult(null)
    setSelectedRow(null)
    setAssetUrls({})
    setProgress({
      pct: 1,
      step_label: 'Iniciando detección…',
      detail: 'Enviando solicitud al motor GPU.',
      steps: [],
    })
    setAlignOpen(false)
    setRunning(true)
    setCancelling(false)
    setRunStartedAt(Date.now())
    try {
      const payload = {
        year_ref: Number(yearRef),
        year_mov: Number(yearMov),
        polygon,
        bbox: bboxFromPolygon(polygon),
        auto_resolution: true,
        target_gsd_m: Number(targetGsd),
        min_prob_pct: Number(minProb),
        predios_buffer_m: Number(prediosBuffer),
        gpu: Number(gpu),
      }
      const started = await deteccionApi.startDetectWms(payload)
      startPolling(started.job_id, {
        pct: 2,
        step_label: 'En cola',
        detail: `Trabajo ${started.job_id}`,
        steps: started.steps || [],
      })
    } catch (err) {
      setRunning(false)
      setRunStartedAt(null)
      setProgress(null)
      toast.error(err.message || 'No se pudo iniciar la detección.')
    }
  }

  async function handleCancel() {
    if (!jobId || cancelling) return
    setCancelling(true)
    setProgress((prev) => ({
      ...(prev || {}),
      step_label: 'Deteniendo…',
      detail: 'Solicitando la cancelación al servidor…',
    }))
    try {
      await deteccionApi.cancelJob(jobId)
      toast.info('Se envió la solicitud de detención del proceso.')
    } catch (err) {
      setCancelling(false)
      toast.error(err.message || 'No se pudo cancelar el proceso.')
    }
  }

  function handleRowClick(row) {
    const bbox = findBboxForRow(result, row)
    setSelectedRow({ ...row, bbox_px: bbox || row.bbox_px || row.bbox })
  }

  const alignLevel = String(
    result?.align_quality?.level || result?.resumen_confiabilidad?.align_level || ''
  ).toLowerCase()
  const rc = result?.resumen_confiabilidad || {}
  const aq = result?.align_quality || {}
  const alignMsg =
    rc.mensaje_usuario ||
    aq.message ||
    (alignLevel
      ? `Nivel de alineación: ${alignLevel}.`
      : 'Detección finalizada. Revise la confiabilidad y valide los hallazgos.')
  const residualM = rc.residual_m ?? aq.residual_m
  const needsAlign = !!(
    result &&
    (result.needs_manual_align ||
      alignLevel === 'poor' ||
      alignLevel === 'bad' ||
      alignLevel === 'warn')
  )
  const alignAlertType =
    alignLevel === 'good' || alignLevel === 'ok'
      ? 'success'
      : needsAlign
        ? 'warning'
        : 'info'
  const polygonReady = !!(polygon && polygon.length >= 4)
  const gpuCount = Array.isArray(health?.engine?.gpus) ? health.engine.gpus.length : 0
  const canStart = health?.reachable && polygonReady && yearRef && yearMov && !running

  return (
    <div className="space-y-5">
      <DetectionProgressModal
        open={running}
        progress={progress}
        startedAt={runStartedAt}
        cancelling={cancelling}
        onCancel={handleCancel}
      />

      {/* Header compacto */}
      <header className="rounded-3xl border border-white/70 bg-white/80 px-5 py-4 shadow-[0_8px_28px_rgba(100,116,139,0.10)] backdrop-blur-md sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-800 text-white shadow-md shadow-brand-800/25">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-accent-600">
                  Inteligencia fiscal · G.A.M.C.
                </p>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Detección de construcciones
                </h1>
              </div>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Compare ortofotos, detecte cambios y valide hallazgos con predios y SISCAT.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {loadingMeta ? (
              <Badge variant="neutral">
                <Spinner className="h-3 w-3" /> Sincronizando…
              </Badge>
            ) : health?.reachable ? (
              <Badge variant="success" dot dotPulse>
                Motor GPU{gpuCount ? ` · ${gpuCount}` : ''}
              </Badge>
            ) : (
              <Badge variant="danger" dot>
                Motor no disponible
              </Badge>
            )}
            <Badge variant={polygonReady ? 'accent' : 'neutral'} dot>
              {polygonReady ? 'Área lista' : 'Sin área'}
            </Badge>
            <Button variant="secondary" size="sm" onClick={loadMeta} disabled={loadingMeta} icon={RefreshCw}>
              Actualizar
            </Button>
          </div>
        </div>
      </header>

      {metaError && (
        <Alert type="warning" title="No se pudo sincronizar con el motor">
          <p className="mt-1 text-slate-800">{metaError}</p>
          <div className="mt-3">
            <Button size="sm" variant="secondary" onClick={loadMeta}>
              Reintentar
            </Button>
          </div>
        </Alert>
      )}

      {!health?.reachable && !loadingMeta && !metaError && (
        <Alert
          type="error"
          title="Motor de detección fuera de servicio"
          message="Verifique la conectividad del motor GPU o contacte al administrador del sistema."
        />
      )}

      {/* Banco de trabajo: parámetros | mapa */}
      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
        <aside className="xl:sticky xl:top-4">
          <Card glass={false} className="!p-0 overflow-hidden">
            <div className="border-b border-slate-100 bg-gradient-to-r from-brand-800 to-brand-600 px-5 py-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
                Configuración
              </p>
              <h2 className="mt-0.5 text-base font-bold">Parámetros de análisis</h2>
            </div>

            <div className="space-y-5 p-5">
              <FieldGroup title="Periodo">
                <Select label="Año A · referencia" value={yearRef} onChange={(e) => setYearRef(e.target.value)}>
                  <option value="">Seleccione…</option>
                  {yearOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Año B · comparación"
                  value={yearMov}
                  onChange={(e) => setYearMov(e.target.value)}
                >
                  <option value="">Seleccione…</option>
                  {yearOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>

              <FieldGroup title="Calidad y filtro">
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-700">Nitidez (GSD)</span>
                    <button
                      type="button"
                      onClick={() => setShowGsdHelp((v) => !v)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-600 hover:text-accent-500"
                    >
                      <Info className="h-3.5 w-3.5" />
                      {showGsdHelp ? 'Ocultar' : 'Ayuda'}
                    </button>
                  </div>
                  <Select value={targetGsd} onChange={(e) => setTargetGsd(e.target.value)}>
                    <option value="0.25">0,25 m/px · máxima</option>
                    <option value="0.30">0,30 m/px · recomendada</option>
                    <option value="0.35">0,35 m/px · áreas extensas</option>
                  </Select>
                  {showGsdHelp && (
                    <p className="mt-2 rounded-xl bg-accent-50 px-3 py-2 text-[11px] leading-relaxed text-slate-700 ring-1 ring-accent-200">
                      El GSD es la resolución de descarga de las ortofotos (no el zoom del mapa).
                      Conserve 0,30 m/px salvo áreas muy extensas. El motor divide automáticamente
                      áreas grandes en bloques.
                    </p>
                  )}
                </div>
                <Select
                  label="Probabilidad mínima"
                  value={minProb}
                  onChange={(e) => setMinProb(e.target.value)}
                >
                  <option value="0">Todas (≥ 0 %)</option>
                  <option value="40">≥ 40 %</option>
                  <option value="50">≥ 50 %</option>
                  <option value="60">≥ 60 %</option>
                  <option value="70">≥ 70 %</option>
                  <option value="80">≥ 80 %</option>
                </Select>
              </FieldGroup>

              <FieldGroup title="Cruce e infraestructura">
                <Select
                  label="Buffer predios"
                  value={prediosBuffer}
                  onChange={(e) => setPrediosBuffer(e.target.value)}
                >
                  {[0, 5, 10, 15, 20, 30].map((n) => (
                    <option key={n} value={String(n)}>
                      {n} m
                    </option>
                  ))}
                </Select>
                <Select
                  label="GPU detector BTC"
                  value={String(gpu)}
                  onChange={(e) => setGpu(Number(e.target.value))}
                >
                  <option value="0">GPU 0</option>
                  <option value="1">GPU 1</option>
                </Select>
                <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
                  <Cpu className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  Las sombras SARU emplean ambas GPUs. Esta opción solo elige la tarjeta del detector.
                </p>
              </FieldGroup>
            </div>

            <div className="space-y-3 border-t border-slate-100 bg-slate-50/80 p-5">
              {!polygonReady && (
                <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                  Dibuje un polígono en el mapa (mínimo 3 vértices) para habilitar la detección.
                </p>
              )}
              <Button
                onClick={handleStart}
                disabled={!canStart}
                loading={running}
                icon={Play}
                className="w-full"
              >
                Detectar cambios
              </Button>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Al iniciar, se abrirá un panel de progreso. La pantalla quedará bloqueada hasta
                finalizar o detener el proceso.
              </p>
            </div>
          </Card>
        </aside>

        <Card glass={false} className="!p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600 ring-1 ring-accent-200">
                <MapPinned className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Área de trabajo
                </p>
                <h2 className="text-sm font-bold text-slate-900">Mapa WMS Catastro</h2>
              </div>
            </div>
            <Badge variant={polygonReady ? 'success' : 'neutral'}>
              {polygonReady ? 'Polígono definido' : 'Pulse el mapa para dibujar'}
            </Badge>
          </div>
          <div className="p-3 sm:p-4">
            <Suspense
              fallback={
                <div className="flex h-[520px] items-center justify-center rounded-2xl bg-slate-50">
                  <EmptyState
                    icon={Loader2}
                    title="Cargando mapa"
                    subtitle="Inicializando el visor cartográfico…"
                    iconClassName="animate-spin text-accent-500 opacity-80"
                  />
                </div>
              }
            >
              <DetectionMap
                onPolygonChange={setPolygon}
                wmsLayers={wmsMeta.layers}
                hosts={wmsMeta.hosts}
                basemapYear={basemapYear}
                onBasemapYearChange={setBasemapYear}
                height={560}
              />
            </Suspense>
          </div>
        </Card>
      </div>

      {/* Resultados */}
      {result && (
        <div ref={resultsRef} className="space-y-5">
          <Alert type={alignAlertType} title="Confiabilidad de la alineación">
            <p className="mt-1 leading-relaxed text-slate-800">{alignMsg}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-700">
              {alignLevel ? <Badge variant={needsAlign ? 'warning' : 'success'}>Nivel: {alignLevel}</Badge> : null}
              {residualM != null ? (
                <Badge variant="neutral">Residual ≈ {Number(residualM).toFixed(2)} m</Badge>
              ) : null}
              {rc.n_confirmadas != null ? (
                <Badge variant="success">Confirmadas: {rc.n_confirmadas}</Badge>
              ) : null}
              {rc.n_revisar_manual != null ? (
                <Badge variant="warning">Revisión manual: {rc.n_revisar_manual}</Badge>
              ) : null}
              {rc.n_rechazadas_total != null ? (
                <Badge variant="danger">Rechazadas: {rc.n_rechazadas_total}</Badge>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant={needsAlign ? 'warning' : 'secondary'} onClick={() => setAlignOpen(true)}>
                {needsAlign
                  ? 'Abrir alineación manual con puntos de control'
                  : 'Revisar / corregir alineación manual'}
              </Button>
            </div>
          </Alert>

          <ManualAlignPanel
            open={alignOpen}
            jobId={jobId || result.job_id}
            imageUrlA={assetUrls.aligned_a || assetUrls.orto_ref}
            imageUrlB={assetUrls.aligned_b || assetUrls.orto_mov}
            yearA={yearRef}
            yearB={yearMov}
            onClose={() => setAlignOpen(false)}
            onApplied={(data) => {
              setAlignOpen(false)
              setResult(null)
              setSelectedRow(null)
              const id = data.job_id || jobId || result.job_id
              if (id) startPolling(id)
            }}
          />

          <div className="grid gap-5 xl:grid-cols-12">
            <Card glass={false} className="space-y-4 xl:col-span-7 !p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600 ring-1 ring-accent-200">
                    <Table2 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                      Resultados
                    </p>
                    <h2 className="text-sm font-bold text-slate-900">Reporte para el arquitecto</h2>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="success">Nuevas {result.n_nueva ?? '—'}</Badge>
                  <Badge variant="danger">Eliminadas {result.n_eliminada ?? '—'}</Badge>
                  <Badge variant="warning">Cambio {result.n_cambio ?? '—'}</Badge>
                </div>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-500">
                Seleccione una fila para validar en la comparación ampliada y consultar SISCAT. El
                porcentaje es un indicador operativo, no certeza legal.
              </p>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="max-h-[420px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-brand-800 text-[10px] font-bold uppercase tracking-wider text-white">
                      <tr>
                        <th className="px-3 py-2.5">N.º</th>
                        <th className="px-3 py-2.5">Tipo</th>
                        <th className="px-3 py-2.5">Prob.</th>
                        <th className="px-3 py-2.5">Código</th>
                        <th className="px-3 py-2.5">Cruce</th>
                        <th className="px-3 py-2.5">Asientos</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {reportRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-10">
                            <EmptyState
                              title="Sin hallazgos en el umbral actual"
                              subtitle={`No hay filas ≥ ${minProb} %. Ajuste el filtro si corresponde.`}
                            />
                          </td>
                        </tr>
                      ) : (
                        reportRows.map((row, idx) => {
                          const asientos =
                            row.asientos_catastro || row.asientos_fields?.asientos_catastro
                          const nAsientos =
                            asientos?.n_registros ?? (asientos?.registros || []).length
                          const selected =
                            selectedRow &&
                            selectedRow.codigo_catastral === row.codigo_catastral &&
                            selectedRow.prob_pct === row.prob_pct &&
                            (selectedRow.tipo || selectedRow.tipo_cambio) ===
                              (row.tipo || row.tipo_cambio)
                          const tipo = row.tipo || row.tipo_cambio || '—'
                          return (
                            <tr
                              key={`${row.codigo_catastral}-${idx}`}
                              className={`cursor-pointer border-t border-slate-100 transition-colors ${
                                selected
                                  ? 'bg-accent-50 ring-1 ring-inset ring-accent-200'
                                  : 'hover:bg-slate-50'
                              }`}
                              onClick={() => handleRowClick(row)}
                            >
                              <td className="px-3 py-2.5 text-slate-600">{row.nro ?? idx + 1}</td>
                              <td className="px-3 py-2.5">
                                <Badge variant={tipoBadgeVariant(tipo)}>{tipo}</Badge>
                              </td>
                              <td className="px-3 py-2.5 font-semibold tabular-nums text-slate-900">
                                {row.prob_pct != null ? `${row.prob_pct}%` : '—'}
                              </td>
                              <td className="px-3 py-2.5 font-medium text-slate-900">
                                {row.codigo_catastral || '—'}
                              </td>
                              <td className="max-w-[140px] truncate px-3 py-2.5 text-slate-600">
                                {row.confianza_cruce || row.confianza || '—'}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600">
                                {asientos?.disponible === false ? 'Error' : nAsientos || '—'}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            <Card glass={false} className="space-y-3 xl:col-span-5 !p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600 ring-1 ring-accent-200">
                  <Images className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Validación
                  </p>
                  <h2 className="text-sm font-bold text-slate-900">
                    Comparación A · {yearRef || '—'} | B · {yearMov || '—'}
                  </h2>
                </div>
              </div>
              <CompareZoomPanel
                row={selectedRow}
                yearA={yearRef}
                yearB={yearMov}
                imageUrlA={assetUrls.aligned_a}
                imageUrlB={assetUrls.aligned_b}
              />
            </Card>
          </div>

          <Card glass={false} className="!p-5">
            <AsientosPanel row={selectedRow} />
          </Card>

          {Object.keys(assetUrls).length > 0 && (
            <Card glass={false} className="!p-5">
              <ResultGallery assetUrls={assetUrls} />
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

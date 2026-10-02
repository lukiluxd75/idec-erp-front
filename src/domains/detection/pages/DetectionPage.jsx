import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import {
  Building2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Images,
  Info,
  Layers2,
  Loader2,
  MapPinned,
  Play,
  RefreshCw,
  Settings2,
  Table2,
} from 'lucide-react'
import { Alert, Badge, Button, Card, EmptyState, Select, Spinner } from '@/shared/ui'
import { detectionApi } from '../api/detection.api'
import CompareZoomPanel from '../components/CompareZoomPanel'
import ValidateEvidenceMaps from '../components/ValidateEvidenceMaps'
import AlignReviewPanel from '../components/AlignReviewPanel'
import FiscalParcelPanel from '../components/FiscalParcelPanel'
import SiscatFileModal from '../components/SiscatFileModal'
import ManualAlignPanel from '../components/ManualAlignPanel'
import ResultGallery from '../components/ResultGallery'
import DetectionProgressModal from '../components/DetectionProgressModal'
import CampaignPicker from '../components/CampaignPicker'
import ParcelValidationButtons from '../components/ParcelValidationButtons'
import ParcelValidationModal from '../components/ParcelValidationModal'
import ProcessedSectorDetailModal from '../components/ProcessedSectorDetailModal'
import ParcelExplorePopup from '../components/ParcelExplorePopup'
import ExportPreviewModal from '../components/ExportPreviewModal'
import { applyParcelReviewToSectors, polygonRingFromGeoJson } from '../utils/processedSectorsLayer'

const DetectionMap = lazy(() => import('../components/DetectionMap'))

const POLL_MS = 800

/** Main view = fiscal validation; the rest are secondary tools. */
const RESULT_TABS = [
  { id: 'validacion', label: 'Validación fiscal', icon: Table2 },
  { id: 'chequeo', label: 'Chequeo A|B', icon: Layers2 },
  { id: 'evidencias', label: 'Galería', icon: Images },
]

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

/**
 * Fiscal intelligence workbench: configure → detect → validate (image vs SISCAT).
 */
export default function DetectionPage() {
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
  // Bumped once a run finishes so DetectionMap clears the just-processed
  // polygon -- left drawn, its points get dragged into the next one.
  const [drawResetSignal, setDrawResetSignal] = useState(0)
  const [campaignId, setCampaignId] = useState(null)
  // Fixed for the campaign's whole life (engineer's call) -- while set, Año
  // A/Año B below are shown but locked to these values, not freely editable.
  const [campaignYears, setCampaignYears] = useState(null)

  /** Everything on screen revolves around the campaign (engineer's rule): any
   * campaign switch destroys -- not hides -- the module's whole visual/data
   * context, so nothing "ghost" reappears if the architect comes back to the
   * same campaign later. The sector's real validation state in the database
   * is untouched; only this page's local UI state resets. */
  function handleCampaignChange(id, campaign) {
    setCampaignId(id)
    if (campaign?.year_a != null && campaign?.year_b != null) {
      setCampaignYears({ year_a: campaign.year_a, year_b: campaign.year_b })
      setYearRef(String(campaign.year_a))
      setYearMov(String(campaign.year_b))
    } else {
      setCampaignYears(null)
    }
    setDrawResetSignal((n) => n + 1)
    setResult(null)
    setSelectedRow(null)
    setAssetUrls({})
    setSelectedSectorId(null)
    setExploring(null)
    setHighlightParcelGeom(null)
  }

  const [jobId, setJobId] = useState(null)
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [metaError, setMetaError] = useState('')
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false)
  const [assetUrls, setAssetUrls] = useState({})
  const [selectedRow, setSelectedRow] = useState(null)
  const [alignOpen, setAlignOpen] = useState(false)
  const [expedienteOpen, setExpedienteOpen] = useState(false)
  const [showGsdHelp, setShowGsdHelp] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [resultTab, setResultTab] = useState('validacion')
  const [cancelling, setCancelling] = useState(false)
  const [runStartedAt, setRunStartedAt] = useState(null)
  const [processedSectors, setProcessedSectors] = useState([])
  const [selectedSectorId, setSelectedSectorId] = useState(null)
  const [presetPolygon, setPresetPolygon] = useState(null)
  const [validationTarget, setValidationTarget] = useState(null)
  const [highlightParcelGeom, setHighlightParcelGeom] = useState(null)
  // "Explorar predio": browsing already-validated parcels of the sector
  // currently open in ProcessedSectorDetailModal (see onExploreParcel below)
  // -- { parcels, index } while active, null otherwise. Hides (not closes)
  // the modal, see its `open` prop further down.
  const [exploring, setExploring] = useState(null)

  const pollRef = useRef(null)
  const objectUrlsRef = useRef([])
  const resultsRef = useRef(null)
  /** After applying manual alignment, do not reopen the modal automatically when re-detection finishes. */
  const skipAutoAlignOpenRef = useRef(false)
  /** setInterval fires every POLL_MS regardless of whether the previous
   * pollJob() call (an HTTP round-trip) already returned. If the engine
   * reports "done" while a prior overlapping call is still in flight, both
   * can reach the done-branch and both call finishWithResult() concurrently
   * -- each hydrateAssets() revokes the other's still-in-use blob URLs
   * (ERR_FILE_NOT_FOUND, random depending on network timing). This guard
   * makes only the first overlapping call actually finish the job. */
  const finishingRef = useRef(false)

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

  const SECTOR_STATUS_LABELS = {
    awaiting_validation: { variant: 'warning', label: 'Pendiente de validación' },
    awaiting_manual_alignment: { variant: 'warning', label: 'Requiere alineación manual' },
    completed: { variant: 'accent', label: 'Sector procesado' },
    error: { variant: 'danger', label: 'Error en el pipeline' },
  }
  const sectorStatusBadge = SECTOR_STATUS_LABELS[result?.processed_sector_status] || null

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true)
    setMetaError('')
    try {
      const [h, layers] = await Promise.all([detectionApi.health(), detectionApi.listWmsLayers()])
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

  // Scoped to the selected campaign: a polygon drawn under one campaign
  // belongs to it, so switching campaigns must make the map overlay show
  // only that campaign's sectors. campaignId === null is "Sin campaña" --
  // sectors with no campaign at all, not "no filter" (Historial is the one
  // screen that still wants everything, via its own unscoped call).
  const loadProcessedSectors = useCallback(async () => {
    try {
      const data = await detectionApi.listProcessedSectors(campaignId, { unassignedOnly: !campaignId })
      setProcessedSectors(Array.isArray(data) ? data : [])
    } catch (err) {
      // Non-blocking: the map overlay is a convenience, not required to run
      // a new detection -- a failed refresh here should not interrupt the page.
      console.warn('No se pudieron cargar los sectores procesados', err)
    }
  }, [campaignId])

  useEffect(() => {
    loadMeta()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [loadMeta])

  useEffect(() => {
    loadProcessedSectors()
  }, [loadProcessedSectors])

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
          const obj = await detectionApi.resolveAssetObjectUrl(path)
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
    const res = await detectionApi.getResult(id)
    setResult(res)
    // By the time GET .../result returns, the backend has already persisted
    // the sector (see job_result's ingestion) — refresh the map overlay so
    // it shows up without the architect having to reload the page.
    loadProcessedSectors()
    // The area just got processed -- clear it so it doesn't linger and
    // interfere with the next polygon drawn for a different block.
    setDrawResetSignal((n) => n + 1)
    await hydrateAssets(res)
    const level = String(
      res.align_quality?.level || res.resumen_confiabilidad?.align_level || ''
    ).toLowerCase()
    const method = String(
      res.align_method || res.align_quality?.method || res.resumen_confiabilidad?.align_method || ''
    ).toLowerCase()
    const isManual = method.startsWith('manual')
    const alignFailed = level === 'poor' || level === 'bad'
    const rows = res?.reporte_arquitecto || []
    if (rows.length) {
      const first = rows[0]
      const bbox = findBboxForRow(res, first)
      setSelectedRow({ ...first, bbox_px: bbox || first.bbox_px || first.bbox })
    }

    skipAutoAlignOpenRef.current = false

    if (alignFailed) {
      setResultTab('validacion')
      // Clear notice + modal so the user can correct and re-apply
      setAlignOpen(true)
      toast.warn(
        isManual
          ? 'La alineación manual sigue siendo insuficiente. Corrija los puntos de control y vuelva a aplicar la detección.'
          : 'La alineación automática es insuficiente. Complete la alineación manual con puntos de control.'
      )
    } else if (isManual) {
      setResultTab('validacion')
      toast.success('Alineación aplicada. Valide cada hallazgo: imagen vs ficha SISCAT.')
    } else {
      setResultTab('validacion')
      toast.success('Detección lista. Valide hallazgos contrastando imagen y SISCAT.')
    }
    const vg = res?.view_geometry || {}
    if (vg.warned || res?.view_geometry_warned) {
      toast.warn(
        vg.level === 'high'
          ? 'Posible oblicuidad fuerte en las ortofotos. Revise el aviso y el chequeo A|B.'
          : 'Indicios de oblicuidad entre A y B. Revise el aviso antes de confiar en los cambios.'
      )
    }
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function pollJob(id) {
    try {
      const prog = await detectionApi.getProgress(id)
      setProgress(prog)
      const status = (prog.status || '').toLowerCase()
      if (status === 'done' || prog.result_ready) {
        stopPolling()
        if (finishingRef.current) return // an overlapping tick already got here first
        finishingRef.current = true
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
          finishingRef.current = false
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
    setExpedienteOpen(false)
    setResultTab('validacion')
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
    skipAutoAlignOpenRef.current = false
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
        campaign_id: campaignId || undefined,
      }
      const started = await detectionApi.startDetectWms(payload)
      startPolling(started.job_id, {
        pct: 2,
        step_label: 'En cola',
        detail: 'Trabajo en cola',
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
      await detectionApi.cancelJob(jobId)
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

  /** Reflects a review/feedback verdict locally (both raw arrays + the
   * selected row) without re-polling the job, matching by affected_parcel_id
   * (present on every row once the backend has persisted the result — see
   * job_result's response enrichment). `sectorId` defaults to the live job's
   * own sector, but ProcessedSectorDetailModal's "Continuar validación"
   * (an older/different sector than whatever job is live here) passes its
   * own sector id explicitly. */
  function handleParcelReviewed(affectedParcelId, validationStatus, sectorId) {
    setResult((prev) => {
      if (!prev) return prev
      const patchArray = (arr) =>
        (arr || []).map((r) =>
          r.affected_parcel_id === affectedParcelId ? { ...r, validation_status: validationStatus } : r
        )
      const cambios = patchArray(prev.cambios)
      // Mirrors the backend's own rule (SqlAffectedParcelReviewRepository.
      // _maybe_complete_sector): completed once every row with an
      // affected_parcel_id stopped being 'pending', regardless of verdict.
      const allReviewed =
        cambios.length > 0 &&
        cambios.every((r) => !r.affected_parcel_id || r.validation_status !== 'pending')
      const completableStatus =
        prev.processed_sector_status === 'awaiting_validation' ||
        prev.processed_sector_status === 'awaiting_manual_alignment'
      return {
        ...prev,
        cambios,
        reporte_arquitecto: patchArray(prev.reporte_arquitecto),
        processed_sector_status:
          allReviewed && completableStatus ? 'completed' : prev.processed_sector_status,
      }
    })
    setSelectedRow((prev) =>
      prev?.affected_parcel_id === affectedParcelId
        ? { ...prev, validation_status: validationStatus }
        : prev
    )

    // Also patch processedSectors -- the map polygon's color is computed
    // from n_confirmed/n_rejected/n_pending on THAT array (see
    // processedSectorsLayer.js), not from `result` above, so without this
    // the color only updated after a full page reload.
    const targetSectorId = sectorId ?? result?.processed_sector_id
    if (targetSectorId != null) {
      setProcessedSectors((prev) => applyParcelReviewToSectors(prev, targetSectorId, validationStatus))
    }
  }

  const viewGeom = result?.view_geometry || {}
  const viewWarned = !!(result?.view_geometry_warned || viewGeom.warned)
  const viewLevel = String(viewGeom.level || '').toLowerCase()
  const viewMsg =
    viewGeom.message ||
    (viewWarned
      ? 'Se detectaron indicios de oblicuidad o geometría distinta entre las ortofotos A y B.'
      : '')
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
  const alignFailed = alignLevel === 'poor' || alignLevel === 'bad'
  const alignAlertType =
    alignLevel === 'good' || alignLevel === 'ok'
      ? 'success'
      : alignFailed
        ? 'warning'
        : needsAlign
          ? 'warning'
          : 'info'
  const alignTitle = alignFailed
    ? 'Alineación insuficiente — debe corregirla'
    : 'Confiabilidad de la alineación'
  const alignCtaLabel = alignFailed
    ? 'Volver a alinear (puntos de control)'
    : needsAlign
      ? 'Abrir alineación manual'
      : 'Revisar alineación'
  const polygonReady = !!(polygon && polygon.length >= 4)
  const gpuCount = Array.isArray(health?.engine?.gpus) ? health.engine.gpus.length : 0
  const canStart = health?.reachable && polygonReady && yearRef && yearMov && !running

  return (
    <div className="space-y-4">
      <DetectionProgressModal
        open={running}
        progress={progress}
        startedAt={runStartedAt}
        cancelling={cancelling}
        onCancel={handleCancel}
      />

      {/* 1 · Encabezado */}
      <header className="liquid-glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-800 text-white">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Detección de construcciones
            </h1>
            <p className="truncate text-xs text-slate-500">
              Compare ortofotos · detecte cambios · valide con SISCAT
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {loadingMeta ? (
            <Badge variant="neutral">
              <Spinner className="h-3 w-3" /> Sincronizando…
            </Badge>
          ) : health?.reachable ? (
            <Badge variant="success" dot>
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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setExportPreviewOpen(true)}
            icon={FileSpreadsheet}
          >
            Exportar
          </Button>
          <Button variant="secondary" size="sm" onClick={loadMeta} disabled={loadingMeta} icon={RefreshCw}>
            Actualizar
          </Button>
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

      {/* 2 · Configurar (arriba) y mapa (ancho completo) */}
      <section className="space-y-3">
        <Card glass={false} className="!p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 shrink-0 text-brand-700" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Paso 1
                </p>
                <h2 className="text-sm font-bold text-slate-900">Parámetros</h2>
              </div>
            </div>
            {!polygonReady && (
              <p className="max-w-md text-[11px] text-slate-600">
                Dibuje un polígono en el mapa para habilitar la detección.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-3 px-4 py-3">
            <div className="min-w-[140px] flex-1 basis-[140px] sm:max-w-[180px]">
              <Select
                label="Año A · referencia"
                value={yearRef}
                onChange={(e) => setYearRef(e.target.value)}
                disabled={!!campaignYears}
                title={campaignYears ? 'Fijado por la campaña seleccionada' : undefined}
              >
                <option value="">Seleccione…</option>
                {yearOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-[140px] flex-1 basis-[140px] sm:max-w-[180px]">
              <Select
                label="Año B · comparación"
                value={yearMov}
                onChange={(e) => setYearMov(e.target.value)}
                disabled={!!campaignYears}
                title={campaignYears ? 'Fijado por la campaña seleccionada' : undefined}
              >
                <option value="">Seleccione…</option>
                {yearOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-[140px] flex-1 basis-[140px] sm:max-w-[180px]">
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
            </div>
            <div className="min-w-[160px] flex-1 basis-[160px] sm:max-w-[220px]">
              <CampaignPicker
                campaignId={campaignId}
                onChange={handleCampaignChange}
                yearOptions={yearOptions.map((o) => o.value)}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <span>Avanzadas</span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <div className="ml-auto flex min-w-[180px] flex-1 basis-[180px] justify-end sm:max-w-[240px] sm:flex-none">
              <Button
                onClick={handleStart}
                disabled={!canStart}
                loading={running}
                icon={Play}
                className="w-full sm:w-auto"
              >
                Detectar cambios
              </Button>
            </div>
          </div>

          {showAdvanced && (
            <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[160px] flex-1 basis-[160px] sm:max-w-[220px]">
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
                </div>
                <div className="min-w-[120px] flex-1 basis-[120px] sm:max-w-[160px]">
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
                </div>
                <div className="min-w-[120px] flex-1 basis-[120px] sm:max-w-[160px]">
                  <Select
                    label="GPU detector BTC"
                    value={String(gpu)}
                    onChange={(e) => setGpu(Number(e.target.value))}
                  >
                    <option value="0">GPU 0</option>
                    <option value="1">GPU 1</option>
                  </Select>
                </div>
              </div>
              {showGsdHelp && (
                <p className="mt-2 max-w-2xl rounded-lg bg-white px-2.5 py-2 text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-200">
                  Resolución de descarga de ortofotos. Conserve 0,30 m/px salvo áreas muy
                  extensas.
                </p>
              )}
            </div>
          )}
        </Card>

        <Card glass={false} className="!p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <MapPinned className="h-4 w-4 text-accent-600" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Paso 2
                </p>
                <h2 className="text-sm font-bold text-slate-900">Área en el mapa</h2>
              </div>
            </div>
            <Badge variant={polygonReady ? 'success' : 'neutral'}>
              {polygonReady ? 'Polígono definido' : 'Pulse el mapa para dibujar'}
            </Badge>
          </div>
          <div className="relative p-3">
            <Suspense
              fallback={
                <div className="flex h-[560px] items-center justify-center rounded-xl bg-slate-50">
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
                height={620}
                processedSectors={processedSectors}
                onViewSectorDetail={(id) => {
                  setSelectedSectorId(id)
                  setExploring(null)
                  setHighlightParcelGeom(null)
                }}
                presetPolygon={presetPolygon}
                highlightParcelGeom={highlightParcelGeom}
                resetSignal={drawResetSignal}
                onClearHighlight={() => {
                  setHighlightParcelGeom(null)
                  setExploring(null)
                }}
              />
            </Suspense>

            {exploring && (
              <ParcelExplorePopup
                parcels={exploring.parcels}
                index={exploring.index}
                onNavigate={(nextIndex) => {
                  if (nextIndex < 0 || nextIndex >= exploring.parcels.length) return
                  setExploring((prev) => ({ ...prev, index: nextIndex }))
                  setHighlightParcelGeom(exploring.parcels[nextIndex].parcel_geom_geojson)
                }}
                onClose={() => {
                  setExploring(null)
                  setHighlightParcelGeom(null)
                }}
              />
            )}
          </div>
        </Card>
      </section>

      {/* `open` also checks !exploring: ParcelExplorePopup hides this modal
          without closing it (same sectorId, so it just refetches once shown
          again) -- closing the explore tool returns here exactly where the
          architect left it, per the engineer's spec. */}
      <ProcessedSectorDetailModal
        open={!!selectedSectorId && !exploring}
        sectorId={selectedSectorId}
        onClose={() => setSelectedSectorId(null)}
        allowReprocess
        onReprocess={(detail) => {
          const sector = processedSectors.find((s) => s.id === detail.id)
          const ring = sector ? polygonRingFromGeoJson(sector.geom_geojson) : null
          if (ring) setPresetPolygon(ring)
          setYearRef(String(detail.year_a))
          setYearMov(String(detail.year_b))
          setResult(null)
          setSelectedRow(null)
          requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          })
        }}
        onExploreParcel={(parcels, startIndex) => {
          setExploring({ parcels, index: startIndex })
          setHighlightParcelGeom(parcels[startIndex]?.parcel_geom_geojson || null)
          requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          })
        }}
        onResumeValidation={async (payload) => {
          setResult(payload)
          setSelectedRow(null)
          toast.success('Retomando la validación de este sector.')
          requestAnimationFrame(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          })
          // Same as finishWithResult -- `result.urls` alone doesn't render
          // anything, hydrateAssets resolves it into the object URLs the
          // gallery/A|B check actually read from `assetUrls`.
          await hydrateAssets(payload)
        }}
      />

      <ParcelValidationModal
        row={validationTarget?.row}
        mode={validationTarget?.mode}
        open={!!validationTarget}
        onClose={() => setValidationTarget(null)}
        onReviewed={handleParcelReviewed}
      />

      <ExportPreviewModal
        open={exportPreviewOpen}
        onClose={() => setExportPreviewOpen(false)}
        campaignId={campaignId}
      />

      {/* 3 · Resultados (solo tras detección) */}
      {result && (
        <section ref={resultsRef} className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Paso 3</p>
              <h2 className="text-base font-bold text-slate-900">
                Banco de validación fiscal
              </h2>
              <p className="mt-0.5 max-w-2xl text-[11px] text-slate-500">
                Contraste lo detectado en imagen con lo declarado en SISCAT. El porcentaje es un
                indicador operativo, no certeza legal.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sectorStatusBadge && (
                <Badge variant={sectorStatusBadge.variant}>{sectorStatusBadge.label}</Badge>
              )}
              <Badge variant="success">Nuevas {result.n_nueva ?? '—'}</Badge>
              <Badge variant="danger">Eliminadas {result.n_eliminada ?? '—'}</Badge>
              <Badge variant="warning">Cambio {result.n_cambio ?? '—'}</Badge>
            </div>
          </div>

          <Alert type={alignAlertType} title={alignTitle}>
            <p className="mt-1 text-sm leading-relaxed text-slate-800">{alignMsg}</p>
            {alignFailed && (
              <p className="mt-2 text-sm font-semibold text-amber-900">
                Los hallazgos pueden no ser fiables hasta corregir la alineación. Marque de nuevo
                los puntos de control (mín. 3, recomendado 6) y pulse «Aplicar y re-detectar».
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {alignLevel ? (
                <Badge variant={alignFailed || needsAlign ? 'warning' : 'success'}>
                  Nivel: {alignLevel}
                </Badge>
              ) : null}
              {residualM != null ? (
                <Badge variant="neutral">Residual ≈ {Number(residualM).toFixed(2)} m</Badge>
              ) : null}
              {rc.n_confirmadas != null ? (
                <Badge variant="success">Confirmadas: {rc.n_confirmadas}</Badge>
              ) : null}
              {rc.n_revisar_manual != null ? (
                <Badge variant="warning">Revisión: {rc.n_revisar_manual}</Badge>
              ) : null}
              <Button
                size="sm"
                variant={alignFailed || needsAlign ? 'warning' : 'secondary'}
                onClick={() => setAlignOpen(true)}
              >
                {alignCtaLabel}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setResultTab('chequeo')}>
                Chequeo A|B
              </Button>
            </div>
          </Alert>

          {viewWarned && (
            <Alert
              type={viewLevel === 'high' ? 'error' : 'warning'}
              title={
                viewLevel === 'high'
                  ? 'Posible oblicuidad fuerte en las ortofotos'
                  : 'Advertencia de geometría de vista (oblicuidad)'
              }
            >
              <p className="mt-1 text-sm leading-relaxed text-slate-800">{viewMsg}</p>
              <p className="mt-2 text-sm text-slate-700">
                Si en un año se ven paredes/fachadas y en el otro solo techos, no confíe en las
                detecciones automáticas. Prefiera capas nadir del mismo tipo de vuelo y valide en
                el chequeo A|B.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {viewGeom.score_a != null ? (
                  <Badge variant="neutral">
                    Índice A ≈ {Number(viewGeom.score_a).toFixed(2)}
                  </Badge>
                ) : null}
                {viewGeom.score_b != null ? (
                  <Badge variant="neutral">
                    Índice B ≈ {Number(viewGeom.score_b).toFixed(2)}
                  </Badge>
                ) : null}
                {viewGeom.mismatch ? (
                  <Badge variant="warning">Geometría A≠B</Badge>
                ) : null}
                <Button size="sm" variant="secondary" onClick={() => setResultTab('chequeo')}>
                  Ver chequeo A|B
                </Button>
              </div>
            </Alert>
          )}

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
              // If still poor/bad after re-detect, finishWithResult will reopen the notice/modal
              skipAutoAlignOpenRef.current = false
              const id = data.job_id || jobId || result.job_id
              if (id) startPolling(id)
            }}
          />

          <Card glass={false} className="!p-0 overflow-hidden">
            <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-2 pt-2">
              {RESULT_TABS.map((tab) => {
                const Icon = tab.icon
                const active = resultTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setResultTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 rounded-t-lg px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-white text-brand-800 shadow-[0_-1px_0_0_white] ring-1 ring-slate-200 ring-b-white'
                        : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <div className="p-3 sm:p-4">
              {resultTab === 'validacion' && (
                <div className="grid gap-3 xl:grid-cols-12 xl:items-start">
                  {/* Cola de casos */}
                  <div className="space-y-2 xl:col-span-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Hallazgos</h3>
                      <span className="text-[11px] tabular-nums text-slate-500">
                        {reportRows.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Seleccione un caso para ver imagen y ficha SISCAT.
                    </p>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="max-h-[min(70vh,640px)] overflow-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="sticky top-0 z-10 bg-brand-800 text-[10px] font-bold uppercase tracking-wider text-white">
                            <tr>
                              <th className="px-2 py-2">#</th>
                              <th className="px-2 py-2">Tipo</th>
                              <th className="px-2 py-2">%</th>
                              <th className="px-2 py-2">Código</th>
                              <th className="px-2 py-2">Validar</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {reportRows.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-3 py-8">
                                  <EmptyState
                                    title="Sin hallazgos"
                                    subtitle={`No hay filas ≥ ${minProb} %.`}
                                  />
                                </td>
                              </tr>
                            ) : (
                              reportRows.map((row, idx) => {
                                const selected =
                                  selectedRow &&
                                  selectedRow.codigo_catastral === row.codigo_catastral &&
                                  selectedRow.prob_pct === row.prob_pct &&
                                  (selectedRow.tipo || selectedRow.tipo_cambio) ===
                                    (row.tipo || row.tipo_cambio)
                                const tipo = row.tipo || row.tipo_cambio || '—'
                                const reviewed =
                                  row.validation_status && row.validation_status !== 'pending'
                                return (
                                  <tr
                                    key={`${row.codigo_catastral}-${idx}`}
                                    className={`cursor-pointer border-t border-slate-100 transition-colors ${
                                      selected
                                        ? 'bg-accent-50 ring-1 ring-inset ring-accent-200'
                                        : reviewed
                                          ? 'bg-slate-50/70 text-slate-500 hover:bg-slate-100'
                                          : 'hover:bg-slate-50'
                                    }`}
                                    onClick={() => handleRowClick(row)}
                                  >
                                    <td className="px-2 py-2 text-slate-500">
                                      {reviewed && (
                                        <span
                                          className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-accent-400"
                                          title={`Revisado: ${row.validation_status}`}
                                        />
                                      )}
                                      {row.nro ?? idx + 1}
                                    </td>
                                    <td className="px-2 py-2">
                                      <Badge variant={tipoBadgeVariant(tipo)}>{tipo}</Badge>
                                    </td>
                                    <td className="px-2 py-2 font-semibold tabular-nums text-slate-900">
                                      {row.prob_pct != null ? row.prob_pct : '—'}
                                    </td>
                                    <td className="max-w-[7.5rem] truncate px-2 py-2 font-medium text-slate-900">
                                      {row.codigo_catastral || '—'}
                                    </td>
                                    <td className="px-2 py-2">
                                      <ParcelValidationButtons
                                        row={row}
                                        onOpenValidation={(r, mode) => setValidationTarget({ row: r, mode })}
                                      />
                                    </td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Evidencia visual */}
                  <div className="space-y-2 xl:col-span-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Evidencia visual</h3>
                        <p className="text-[11px] text-slate-500">
                          Zoom A|B + capas predios / vías / manzanas
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setResultTab('chequeo')}
                        className="text-[11px] font-semibold text-accent-600 hover:underline"
                      >
                        Tablero / detecciones
                      </button>
                    </div>
                    {result.img_bbox?.length === 4 ? (
                      <ValidateEvidenceMaps
                        row={selectedRow}
                        yearA={yearRef}
                        yearB={yearMov}
                        imageUrlA={assetUrls.aligned_a || assetUrls.orto_ref}
                        imageUrlB={assetUrls.aligned_b || assetUrls.orto_mov}
                        resultadoUrl={assetUrls.resultado}
                        imgBbox={result.img_bbox}
                        imgWidth={result.img_width}
                        imgHeight={result.img_height}
                        hosts={wmsMeta.hosts}
                      />
                    ) : (
                      <CompareZoomPanel
                        row={selectedRow}
                        yearA={yearRef}
                        yearB={yearMov}
                        imageUrlA={assetUrls.aligned_a || assetUrls.orto_ref}
                        imageUrlB={assetUrls.aligned_b || assetUrls.orto_mov}
                      />
                    )}
                  </div>

                  {/* Ficha SISCAT */}
                  <div className="xl:col-span-4 xl:sticky xl:top-3 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
                    <div className="mb-2">
                      <h3 className="text-sm font-bold text-slate-900">Ficha SISCAT</h3>
                      <p className="text-[11px] text-slate-500">
                        Datos oficiales del predio para contrastar con la imagen.
                      </p>
                    </div>
                    <FiscalParcelPanel
                      row={selectedRow}
                      onOpenFullExpediente={() => setExpedienteOpen(true)}
                    />
                  </div>
                </div>
              )}

              {resultTab === 'chequeo' && (
                <AlignReviewPanel
                  yearA={yearRef}
                  yearB={yearMov}
                  alignCheckUrl={assetUrls.align_check}
                  imageUrlA={assetUrls.aligned_a || assetUrls.orto_ref}
                  imageUrlB={assetUrls.aligned_b || assetUrls.orto_mov}
                  resultadoUrl={assetUrls.resultado}
                  panelUrl={assetUrls.panel_resultado}
                  defaultMode={
                    assetUrls.align_check ? 'tablero' : assetUrls.resultado ? 'resultado' : 'lado'
                  }
                />
              )}

              {resultTab === 'evidencias' &&
                (Object.keys(assetUrls).length > 0 ? (
                  <ResultGallery assetUrls={assetUrls} compact />
                ) : (
                  <EmptyState
                    title="Sin evidencias visuales"
                    subtitle="Este trabajo no devolvió imágenes de resultado."
                  />
                ))}
            </div>
          </Card>

          <SiscatFileModal
            open={expedienteOpen}
            row={selectedRow}
            onClose={() => setExpedienteOpen(false)}
          />
        </section>
      )}
    </div>
  )
}

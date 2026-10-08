import DataTable from '@/shared/ui/DataTable'
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import {
  CheckCircle2,
  Crosshair,
  Eraser,
  Loader2,
  MapPinned,
  RefreshCw,
  Square,
  Undo2,
  X,
} from 'lucide-react'
import { Badge, Button, Card, EmptyState, Select, Spinner } from '@/shared/ui'
import { alignmentApi } from '../api/alignment.api'
import AlignmentBlockDetailModal from '../components/AlignmentBlockDetailModal'
import { buildCorrectedOverlay } from '../utils/correctedOverlay'

const AlignmentMap = lazy(() => import('../components/AlignmentMap'))

const REFERENCE_YEAR = 2015

const STATUS_BADGE = {
  draft: { variant: 'warning', label: 'Borrador' },
  confirmed: { variant: 'success', label: 'Confirmado' },
}

function fmtDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return value
  }
}

export default function AlignmentPage() {
  const [wmsMeta, setWmsMeta] = useState({ layers: [], hosts: [], years: [] })
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [targetYear, setTargetYear] = useState('')

  const [blocks, setBlocks] = useState([])
  const [loadingBlocks, setLoadingBlocks] = useState(false)
  const [coverage, setCoverage] = useState(null)

  const [mode, setMode] = useState('idle') // 'idle' | 'draw-block' | 'pick-point'
  const [blockRing, setBlockRing] = useState([])
  const [controlPoints, setControlPoints] = useState([])
  const [pendingRef, setPendingRef] = useState(null)
  const [basemapMode, setBasemapMode] = useState('base') // 'base' (2015) | 'target'
  const [saving, setSaving] = useState(false)

  const [selectedBlockId, setSelectedBlockId] = useState(null)

  const [resultOverlay, setResultOverlay] = useState(null)
  const [resultLoading, setResultLoading] = useState(false)
  const resultOverlayUrlRef = useRef(null)

  const yearOptions = useMemo(
    () => (wmsMeta.years || []).filter((y) => y !== REFERENCE_YEAR),
    [wmsMeta.years]
  )

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true)
    try {
      const layers = await alignmentApi.listWmsLayers()
      const list = layers?.layers || []
      const years = (layers?.years || list.map((l) => l.year) || []).filter(Boolean)
      const unique = [...new Set(years)].sort((a, b) => a - b)
      setWmsMeta({ layers: list, hosts: layers?.hosts || [], years: unique })
      if (!targetYear) {
        const candidates = unique.filter((y) => y !== REFERENCE_YEAR)
        if (candidates.length) setTargetYear(String(candidates.includes(2018) ? 2018 : candidates[0]))
      }
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar el catálogo de capas WMS.')
    } finally {
      setLoadingMeta(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadMeta()
  }, [loadMeta])

  const loadBlocks = useCallback(async (year) => {
    if (!year) return
    setLoadingBlocks(true)
    try {
      const [list, cov] = await Promise.all([
        alignmentApi.listBlocks(year),
        alignmentApi.getCoverage(year),
      ])
      setBlocks(Array.isArray(list) ? list : [])
      setCoverage(cov)
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar las manzanas ya alineadas.')
    } finally {
      setLoadingBlocks(false)
    }
  }, [])

  useEffect(() => {
    if (targetYear) loadBlocks(Number(targetYear))
  }, [targetYear, loadBlocks])

  function resetDrawing() {
    setMode('idle')
    setBlockRing([])
    setControlPoints([])
    setPendingRef(null)
    setBasemapMode('base')
  }

  function clearResultOverlay() {
    if (resultOverlayUrlRef.current) {
      URL.revokeObjectURL(resultOverlayUrlRef.current)
      resultOverlayUrlRef.current = null
    }
    setResultOverlay(null)
  }

  useEffect(() => {
    return () => clearResultOverlay()
  }, []) // revoke the corrected-image blob URL on unmount

  function handleYearChange(value) {
    setTargetYear(value)
    resetDrawing()
    clearResultOverlay()
  }

  async function handlePreviewResult(block) {
    setResultLoading(true)
    try {
      const wmsLayer = (wmsMeta.layers || []).find((l) => Number(l.year) === block.year)
      const overlay = await buildCorrectedOverlay({
        block,
        wmsLayer,
        gisHost: (wmsMeta.hosts && wmsMeta.hosts[0]) || undefined,
      })
      if (resultOverlayUrlRef.current) URL.revokeObjectURL(resultOverlayUrlRef.current)
      resultOverlayUrlRef.current = overlay.imageUrl
      setResultOverlay(overlay)
      setSelectedBlockId(null)
      toast.success(`Mostrando el resultado de la manzana #${block.id} en el mapa.`)
    } catch (err) {
      toast.error(err.message || 'No se pudo generar la vista previa del resultado.')
    } finally {
      setResultLoading(false)
    }
  }

  function startDrawBlock() {
    setMode('draw-block')
  }

  function startPickPoint() {
    setPendingRef(null)
    setBasemapMode('base')
    setMode('pick-point')
  }

  function cancelMode() {
    setMode('idle')
    setPendingRef(null)
  }

  function handleMapClick(lonlat) {
    if (mode === 'draw-block') {
      setBlockRing((prev) => [...prev, lonlat])
      return
    }
    if (mode === 'pick-point') {
      if (!pendingRef) {
        setPendingRef(lonlat)
        setBasemapMode('target')
        toast.info(`Ahora marque el mismo punto en la imagen de ${targetYear}.`)
      } else {
        const [lonRef, latRef] = pendingRef
        const [lonMov, latMov] = lonlat
        setControlPoints((prev) => [...prev, { lon_ref: lonRef, lat_ref: latRef, lon_mov: lonMov, lat_mov: latMov }])
        setPendingRef(null)
        setBasemapMode('base')
        setMode('idle')
        toast.success('Punto de control agregado.')
      }
    }
  }

  function undoLastBlockPoint() {
    setBlockRing((prev) => prev.slice(0, -1))
  }

  function clearBlockRing() {
    setBlockRing([])
  }

  function removeControlPoint(idx) {
    setControlPoints((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (blockRing.length < 3) {
      toast.error('Dibuje el polígono de la manzana (mínimo 3 vértices).')
      return
    }
    if (controlPoints.length < 3) {
      toast.error('Marque al menos 3 puntos de control.')
      return
    }
    setSaving(true)
    try {
      await alignmentApi.createBlock({
        year: Number(targetYear),
        ring: blockRing,
        control_points: controlPoints,
      })
      toast.success('Manzana guardada.')
      resetDrawing()
      loadBlocks(Number(targetYear))
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar la manzana.')
    } finally {
      setSaving(false)
    }
  }

  const currentBasemapYear = basemapMode === 'base' ? REFERENCE_YEAR : Number(targetYear)
  const coverageHa = coverage ? (coverage.covered_area_m2 / 10_000).toFixed(2) : null

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-800 text-white">
            <Crosshair className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Alineación</h1>
            <p className="truncate text-xs text-slate-500">
              Georreferenciación manual, manzana por manzana, contra la capa fija de {REFERENCE_YEAR}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={loadMeta} disabled={loadingMeta} icon={RefreshCw}>
          Actualizar capas
        </Button>
      </header>

      <Card glass={false} className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <div className="min-w-[160px]">
            <Select
              label="Año a corregir"
              value={targetYear}
              onChange={(e) => handleYearChange(e.target.value)}
              disabled={loadingMeta || mode !== 'idle'}
            >
              {yearOptions.length === 0 ? (
                <option value="">Cargando…</option>
              ) : (
                yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))
              )}
            </Select>
          </div>

          {coverage && (
            <Badge variant="accent">
              {coverage.n_blocks} manzana(s) confirmada(s) · {coverageHa} ha cubiertas
            </Badge>
          )}

          {resultLoading && <Badge variant="neutral">Generando resultado…</Badge>}
          {resultOverlay && (
            <Badge variant="success">
              Mostrando resultado corregido
              <button
                type="button"
                onClick={clearResultOverlay}
                className="ml-1 text-slate-500 hover:text-state-danger"
                aria-label="Quitar resultado del mapa"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={basemapMode === 'base' ? 'primary' : 'secondary'}
              onClick={() => setBasemapMode('base')}
              disabled={mode === 'pick-point'}
            >
              Ver {REFERENCE_YEAR} (base)
            </Button>
            <Button
              size="sm"
              variant={basemapMode === 'target' ? 'primary' : 'secondary'}
              onClick={() => setBasemapMode('target')}
              disabled={mode === 'pick-point' || !targetYear}
            >
              Ver {targetYear || '…'}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
          {mode === 'idle' ? (
            <>
              <Button size="sm" variant="secondary" icon={Square} onClick={startDrawBlock} disabled={!targetYear}>
                Dibujar manzana
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={Crosshair}
                onClick={startPickPoint}
                disabled={!targetYear}
              >
                Agregar punto de control
              </Button>
            </>
          ) : mode === 'draw-block' ? (
            <>
              <p className="text-xs font-semibold text-accent-700">
                Pulse el mapa para agregar vértices (no cruce predios ni cubra toda la calle) · {blockRing.length} vértice(s)
              </p>
              <Button size="sm" variant="secondary" icon={Undo2} onClick={undoLastBlockPoint} disabled={!blockRing.length}>
                Deshacer
              </Button>
              <Button size="sm" variant="secondary" icon={Eraser} onClick={clearBlockRing} disabled={!blockRing.length}>
                Limpiar
              </Button>
              <Button size="sm" variant="secondary" icon={X} onClick={cancelMode}>
                Listo
              </Button>
            </>
          ) : (
            <p className="text-xs font-semibold text-accent-700">
              {pendingRef
                ? `Ahora marque el mismo punto sobre la imagen de ${targetYear}…`
                : `Marque el punto de referencia sobre la base ${REFERENCE_YEAR}…`}
              <Button size="sm" variant="secondary" icon={X} onClick={cancelMode} className="ml-2">
                Cancelar
              </Button>
            </p>
          )}

          {blockRing.length >= 3 && controlPoints.length >= 3 && mode === 'idle' && (
            <Button size="sm" variant="primary" icon={CheckCircle2} onClick={handleSave} loading={saving} className="ml-auto">
              Guardar manzana
            </Button>
          )}
        </div>

        <div className="p-3">
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
            <AlignmentMap
              wmsLayers={wmsMeta.layers}
              hosts={wmsMeta.hosts}
              basemapYear={currentBasemapYear}
              height={560}
              mode={mode}
              blockRing={blockRing}
              refPoints={controlPoints}
              movPoints={controlPoints}
              showRefPoints={basemapMode === 'base'}
              showMovPoints={basemapMode === 'target'}
              blocks={blocks}
              resultOverlay={resultOverlay}
              onMapClick={handleMapClick}
              onViewBlock={(block) => setSelectedBlockId(block.id)}
            />
          </Suspense>
        </div>

        {controlPoints.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-3">
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              Puntos de control marcados ({controlPoints.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {controlPoints.map((p, idx) => (
                <Badge key={idx} variant="neutral">
                  #{idx + 1}
                  <button
                    type="button"
                    onClick={() => removeControlPoint(idx)}
                    className="ml-1 text-slate-400 hover:text-state-danger"
                    aria-label={`Quitar punto ${idx + 1}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card glass={false} className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <h2 className="text-sm font-bold text-slate-900">Manzanas alineadas · {targetYear || '—'}</h2>
        </div>
        {loadingBlocks ? (
          <div className="flex items-center justify-center py-10">
            <Spinner className="h-6 w-6" />
          </div>
        ) : blocks.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={MapPinned}
              title="Sin manzanas alineadas todavía"
              subtitle="Dibuje una manzana y marque al menos 3 puntos de control para empezar."
            />
          </div>
        ) : (
          <div className="overflow-auto">
            <DataTable>
<table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">RMSE</th>
                  <th className="px-3 py-2">Creado por</th>
                  <th className="px-3 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((b) => {
                  const badge = STATUS_BADGE[b.status] || { variant: 'neutral', label: b.status }
                  return (
                    <tr
                      key={b.id}
                      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                      onClick={() => setSelectedBlockId(b.id)}
                    >
                      <td className="px-3 py-2 font-semibold text-slate-900">{b.id}</td>
                      <td className="px-3 py-2">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-700">
                        {b.rmse_m != null ? `${b.rmse_m} m` : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{b.created_by_username || '—'}</td>
                      <td className="px-3 py-2 text-[11px] text-slate-500">{fmtDate(b.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
</DataTable>
          </div>
        )}
      </Card>

      <AlignmentBlockDetailModal
        open={!!selectedBlockId}
        blockId={selectedBlockId}
        onClose={() => setSelectedBlockId(null)}
        onChanged={() => loadBlocks(Number(targetYear))}
        onPreviewResult={handlePreviewResult}
      />
    </div>
  )
}

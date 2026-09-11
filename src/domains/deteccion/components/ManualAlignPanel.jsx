import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../styles/deteccion-precision-cursor.css'
import { toast } from 'react-toastify'
import { Alert, Button, Select, Spinner } from '@/shared/ui'
import { deteccionApi } from '../api/deteccion.api'

const AM_COLORS = ['#3dff9a', '#ffd966', '#8ec8ef', '#ff6b6b', '#c9a0ff', '#ffa86b']

function makeNumberIcon(label, color) {
  return L.divIcon({
    className: 'am-pin',
    html:
      `<div style="transform:translate(-50%,-50%);width:26px;height:26px;border-radius:50%;` +
      `border:2px solid #0a0d12;background:${color};color:#111;font:700 12px Poppins,sans-serif;` +
      `display:flex;align-items:center;justify-content:center;` +
      `box-shadow:0 0 0 2px ${color},0 2px 8px rgba(0,0,0,.45)">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

function bboxToBounds(bbox) {
  const [minLon, minLat, maxLon, maxLat] = bbox.map(Number)
  return L.latLngBounds([minLat, minLon], [maxLat, maxLon])
}

function latLngToPixel(latlng, bbox, width, height) {
  const [minLon, minLat, maxLon, maxLat] = bbox
  const x = ((latlng.lng - minLon) / Math.max(maxLon - minLon, 1e-12)) * width
  const y = ((maxLat - latlng.lat) / Math.max(maxLat - minLat, 1e-12)) * height
  return { x, y }
}

function pixelToLatLng(x, y, bbox, width, height) {
  const [minLon, minLat, maxLon, maxLat] = bbox
  const lng = minLon + (x / width) * (maxLon - minLon)
  const lat = maxLat - (y / height) * (maxLat - minLat)
  return L.latLng(lat, lng)
}

/**
 * Alineación manual con zoom Leaflet, puntos numerados y sincronización A↔B.
 */
export default function ManualAlignPanel({
  open,
  jobId,
  imageUrlA,
  imageUrlB,
  yearA,
  yearB,
  onClose,
  onApplied,
}) {
  const mapANode = useRef(null)
  const mapBNode = useRef(null)
  const mapARef = useRef(null)
  const mapBRef = useRef(null)
  const marksARef = useRef(null)
  const marksBRef = useRef(null)
  const syncingRef = useRef(false)
  const objectUrlsRef = useRef([])
  const metaRef = useRef(null)
  const pairsRef = useRef([])
  const pendingARef = useRef(null)
  const syncViewsRef = useRef(true)

  const [loadingMeta, setLoadingMeta] = useState(false)
  const [metaError, setMetaError] = useState('')
  const [meta, setMeta] = useState(null)
  const [pairs, setPairs] = useState([])
  const [pendingA, setPendingA] = useState(null)
  const [syncViews, setSyncViews] = useState(true)
  const [method, setMethod] = useState('affine')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewMeta, setPreviewMeta] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyAction, setBusyAction] = useState(null)
  const [actionError, setActionError] = useState('')
  const [mapsReady, setMapsReady] = useState(false)

  pairsRef.current = pairs
  pendingARef.current = pendingA
  metaRef.current = meta
  syncViewsRef.current = syncViews

  const revokeObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    objectUrlsRef.current = []
  }, [])

  const destroyMaps = useCallback(() => {
    try {
      mapARef.current?.remove()
    } catch {
      /* ignore */
    }
    try {
      mapBRef.current?.remove()
    } catch {
      /* ignore */
    }
    mapARef.current = null
    mapBRef.current = null
    marksARef.current = null
    marksBRef.current = null
    setMapsReady(false)
  }, [])

  const refreshMarkers = useCallback(() => {
    const m = metaRef.current
    if (!m?.bbox || !marksARef.current || !marksBRef.current) return
    marksARef.current.clearLayers()
    marksBRef.current.clearLayers()
    pairsRef.current.forEach((p, i) => {
      const col = AM_COLORS[i % AM_COLORS.length]
      const icon = makeNumberIcon(String(i + 1), col)
      marksARef.current.addLayer(
        L.marker(pixelToLatLng(p.ax, p.ay, m.bbox, m.width, m.height), { icon, interactive: false })
      )
      marksBRef.current.addLayer(
        L.marker(pixelToLatLng(p.bx, p.by, m.bbox, m.width, m.height), { icon, interactive: false })
      )
    })
    if (pendingARef.current) {
      const icon = makeNumberIcon('?', '#ffffff')
      marksARef.current.addLayer(
        L.marker(
          pixelToLatLng(pendingARef.current.ax, pendingARef.current.ay, m.bbox, m.width, m.height),
          { icon, interactive: false }
        )
      )
    }
  }, [])

  // Load align-manual metadata
  useEffect(() => {
    if (!open || !jobId) {
      destroyMaps()
      revokeObjectUrls()
      setPairs([])
      setPendingA(null)
      setPreviewUrl(null)
      setPreviewMeta('')
      setMeta(null)
      setMetaError('')
      setBusyAction(null)
      return undefined
    }

    let cancelled = false
    ;(async () => {
      setLoadingMeta(true)
      setMetaError('')
      setMapsReady(false)
      destroyMaps()
      try {
        const data = await deteccionApi.getAlignManual(jobId)
        if (cancelled) return
        if (data?.available === false) {
          setMetaError(data.reason || 'La alineación manual no está disponible para este trabajo.')
          return
        }
        const bbox = (data.bbox || data.img_bbox || []).map(Number)
        const width = Number(data.width)
        const height = Number(data.height)
        if (bbox.length !== 4 || !(width > 0) || !(height > 0)) {
          throw new Error(
            'El trabajo no incluye bbox o dimensiones. Ejecute nuevamente la detección.'
          )
        }

        revokeObjectUrls()
        const urlApath = data.urls?.orto_ref || data.urls?.aligned_a
        const urlBpath = data.urls?.orto_mov || data.urls?.aligned_b
        let blobA = imageUrlA
        let blobB = imageUrlB
        if (urlApath) {
          blobA = await deteccionApi.resolveAssetObjectUrl(urlApath)
          if (cancelled) return
          objectUrlsRef.current.push(blobA)
        }
        if (urlBpath) {
          blobB = await deteccionApi.resolveAssetObjectUrl(urlBpath)
          if (cancelled) return
          objectUrlsRef.current.push(blobB)
        }
        if (!blobA || !blobB) {
          throw new Error('No se pudieron cargar las ortofotos A y B del trabajo.')
        }

        setMeta({
          bbox,
          width,
          height,
          yearA: data.year_ref ?? yearA,
          yearB: data.year_mov ?? yearB,
          blobA,
          blobB,
        })
        setPairs([])
        setPendingA(null)
      } catch (err) {
        if (!cancelled) setMetaError(err.message || 'No se pudo preparar la alineación manual.')
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    })()

    return () => {
      cancelled = true
      destroyMaps()
      revokeObjectUrls()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jobId])

  // Init Leaflet maps when meta + DOM nodes are ready
  useEffect(() => {
    if (!open || !meta || loadingMeta || metaError) return undefined
    if (!mapANode.current || !mapBNode.current) return undefined

    destroyMaps()

    const opts = {
      doubleClickZoom: false,
      attributionControl: false,
      maxZoom: 22,
      minZoom: 12,
      zoomControl: true,
    }
    const mapA = L.map(mapANode.current, opts)
    const mapB = L.map(mapBNode.current, opts)
    mapARef.current = mapA
    mapBRef.current = mapB
    ;[mapA, mapB].forEach((m) => {
      m.getContainer().classList.add('deteccion-precision-cursor')
      m.getContainer().style.cursor = 'crosshair'
      m.getContainer().title = 'Clic para marcar el punto de control'
    })
    marksARef.current = L.layerGroup().addTo(mapA)
    marksBRef.current = L.layerGroup().addTo(mapB)

    const bounds = bboxToBounds(meta.bbox)
    L.imageOverlay(meta.blobA, bounds, { opacity: 1, interactive: false }).addTo(mapA)
    L.imageOverlay(meta.blobB, bounds, { opacity: 1, interactive: false }).addTo(mapB)

    function onMapClick(isA, e) {
      const m = metaRef.current
      if (!m?.bbox) return
      const padBounds = bboxToBounds(m.bbox).pad(0.002)
      if (!padBounds.contains(e.latlng)) {
        toast.warn('Seleccione un punto dentro del área del trabajo.')
        return
      }
      const { x, y } = latLngToPixel(e.latlng, m.bbox, m.width, m.height)
      if (x < 0 || y < 0 || x > m.width || y > m.height) return
      if (isA) {
        setPendingA({ ax: x, ay: y })
        toast.info('Seleccione el mismo detalle en el panel B.')
        return
      }
      if (!pendingARef.current) {
        toast.warn('Primero seleccione el punto en el panel A (izquierda).')
        return
      }
      setPairs((prev) => [
        ...prev,
        {
          ax: pendingARef.current.ax,
          ay: pendingARef.current.ay,
          bx: x,
          by: y,
        },
      ])
      setPendingA(null)
    }

    function syncFrom(source) {
      if (!syncViewsRef.current || syncingRef.current) return
      const target = source === mapA ? mapB : mapA
      syncingRef.current = true
      try {
        target.setView(source.getCenter(), source.getZoom(), { animate: false })
      } finally {
        syncingRef.current = false
      }
    }

    mapA.on('click', (e) => onMapClick(true, e))
    mapB.on('click', (e) => onMapClick(false, e))
    mapA.on('moveend', () => syncFrom(mapA))
    mapB.on('moveend', () => syncFrom(mapB))
    mapA.on('zoomend', () => syncFrom(mapA))
    mapB.on('zoomend', () => syncFrom(mapB))

    syncingRef.current = true
    mapA.fitBounds(bounds, { padding: [12, 12] })
    mapB.fitBounds(bounds, { padding: [12, 12] })
    syncingRef.current = false

    const t = setTimeout(() => {
      try {
        mapA.invalidateSize()
        mapB.invalidateSize()
        mapA.fitBounds(bounds, { padding: [12, 12] })
        mapB.fitBounds(bounds, { padding: [12, 12] })
      } catch {
        /* ignore */
      }
      setMapsReady(true)
      refreshMarkers()
    }, 150)

    return () => {
      clearTimeout(t)
      destroyMaps()
    }
  }, [open, meta, loadingMeta, metaError, destroyMaps, refreshMarkers])

  useEffect(() => {
    if (mapsReady) refreshMarkers()
  }, [pairs, pendingA, mapsReady, refreshMarkers])

  if (!open) return null

  async function handlePreview() {
    if (pairs.length < 3) {
      toast.warn('Se requieren al menos 3 pares de puntos de control.')
      return
    }
    setBusy(true)
    setBusyAction('preview')
    setActionError('')
    try {
      const data = await deteccionApi.previewAlignManual(jobId, { points: pairs, method })
      setPreviewMeta(
        `Residual ≈ ${data.residual_m != null ? Number(data.residual_m).toFixed(2) : '—'} m` +
          (data.cc != null ? ` · correlación = ${Number(data.cc).toFixed(3)}` : '')
      )
      const imgPath = data.preview_url || data.urls?.preview || data.url
      if (imgPath) {
        const obj = await deteccionApi.resolveAssetObjectUrl(imgPath)
        setPreviewUrl(obj)
      }
      toast.success('Vista previa generada correctamente.')
    } catch (err) {
      const msg = err.message || 'No se pudo generar la vista previa.'
      setActionError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
      setBusyAction(null)
    }
  }

  async function handleApply() {
    if (pairs.length < 3) {
      toast.warn('Se requieren al menos 3 pares de puntos de control.')
      return
    }
    setBusy(true)
    setBusyAction('apply')
    setActionError('')
    try {
      const data = await deteccionApi.applyAlignManual(jobId, { points: pairs, method })
      toast.info('Alineación aplicada. Se reinicia la detección…')
      onApplied?.(data)
    } catch (err) {
      const msg = err.message || 'No se pudo aplicar la alineación.'
      setActionError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
      setBusyAction(null)
    }
  }

  const waitingB = !!pendingA
  const statusText = waitingB
    ? `Paso 2/2: acerque el zoom en B y seleccione el mismo detalle. Pares: ${pairs.length}`
    : pairs.length === 0
      ? 'Paso 1/2: acerque el zoom en A y seleccione un detalle claro (esquina o cruce).'
      : `Par N.º ${pairs.length} guardado. Paso 1/2: nuevo punto en A. Mínimo 3 · recomendado 6.`

  const panel = (
    <div
      className="fixed inset-0 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-6"
      style={{ zIndex: 10040 }}
      role="dialog"
      aria-modal="true"
      aria-label="Alineación manual"
    >
      <div className="my-4 w-full max-w-6xl overflow-hidden rounded-3xl border border-state-amber/35 bg-white shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-state-amber/20 bg-gradient-to-r from-state-amber/15 to-transparent px-5 py-4">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-state-amber">
              Corrección geométrica
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">
              Alineación manual con puntos de control
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Use la rueda del ratón para acercar. Flujo: 1) punto en A → 2) el mismo detalle en B →
              repetir (≥ 3, recomendado 6). Los marcadores numerados identifican cada par.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {loadingMeta && (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Spinner /> Cargando mapas A y B del trabajo…
            </div>
          )}
          {metaError && <Alert type="error" title="No se pudo abrir" message={metaError} />}
          {actionError && (
            <Alert type="error" title="No se pudo aplicar / previsualizar" message={actionError} />
          )}

          {!loadingMeta && !metaError && meta && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-brand-800"
                    checked={syncViews}
                    onChange={(e) => setSyncViews(e.target.checked)}
                  />
                  Sincronizar vista A ↔ B
                </label>
                <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {waitingB ? 'Esperando selección en B' : 'Esperando selección en A'}
                </span>
              </div>

              <div
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                  waitingB
                    ? 'border-accent-300 bg-accent-50 text-slate-800'
                    : 'border-state-amber/40 bg-state-amber/10 text-slate-800'
                }`}
              >
                {statusText}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div
                  className={`overflow-hidden rounded-2xl border-2 bg-slate-950 ${
                    waitingB ? 'border-slate-700' : 'border-accent-400'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                    <span>A · ANTES · año {meta.yearA ?? yearA ?? '—'}</span>
                    <span className="rounded bg-white/10 px-2 py-0.5">
                      {waitingB ? 'Punto A listo' : '1 · seleccione aquí'}
                    </span>
                  </div>
                  <div
                    ref={mapANode}
                    className="deteccion-precision-cursor h-[400px] w-full"
                    style={{ cursor: 'crosshair' }}
                    title="Clic para marcar el punto de control en A"
                  />
                </div>
                <div
                  className={`overflow-hidden rounded-2xl border-2 bg-slate-950 ${
                    waitingB ? 'border-accent-400' : 'border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                    <span>B · DESPUÉS · año {meta.yearB ?? yearB ?? '—'}</span>
                    <span className="rounded bg-white/10 px-2 py-0.5">
                      {waitingB ? '2 · seleccione aquí ahora' : '2 · luego aquí'}
                    </span>
                  </div>
                  <div
                    ref={mapBNode}
                    className="deteccion-precision-cursor h-[400px] w-full"
                    style={{ cursor: 'crosshair' }}
                    title="Clic para marcar el punto de control en B"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <p className="mr-auto pb-2 text-sm font-medium text-slate-800">
                  {pairs.length} pares · mínimo 3 · recomendado 6
                </p>
                <div className="w-40">
                  <Select label="Método" value={method} onChange={(e) => setMethod(e.target.value)}>
                    <option value="affine">Afín (≥ 3)</option>
                    <option value="homography">Homografía (≥ 4)</option>
                  </Select>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPairs((p) => p.slice(0, -1))}
                  disabled={!pairs.length || busy}
                >
                  Deshacer
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPairs([])
                    setPendingA(null)
                  }}
                  disabled={busy}
                >
                  Limpiar
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePreview}
                  disabled={busy || pairs.length < 3}
                  loading={busyAction === 'preview'}
                >
                  Vista previa
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={busy || pairs.length < 3}
                  loading={busyAction === 'apply'}
                >
                  Aplicar y re-detectar
                </Button>
              </div>

              {pairs.length > 0 && (
                <ul className="space-y-1 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
                  {pairs.map((p, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-slate-900"
                          style={{ background: AM_COLORS[i % AM_COLORS.length] }}
                        >
                          {i + 1}
                        </span>
                        A({p.ax.toFixed(0)}, {p.ay.toFixed(0)}) ↔ B({p.bx.toFixed(0)},{' '}
                        {p.by.toFixed(0)})
                      </span>
                      <button
                        type="button"
                        className="font-semibold text-state-danger hover:underline"
                        onClick={() => setPairs((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {previewMeta && (
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800">
                  {previewMeta}
                </p>
              )}
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Vista previa de la alineación"
                  className="max-h-72 w-full rounded-2xl border border-slate-200 object-contain"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(panel, document.body) : panel
}

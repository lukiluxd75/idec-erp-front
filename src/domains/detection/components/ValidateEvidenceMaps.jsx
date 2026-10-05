import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { EmptyState } from '@/shared/ui'
import { MousePointerClick } from 'lucide-react'

const GIS_HOSTS = ['https://gs.catastrocbba.com', 'http://192.168.105.219:6080', 'http://172.16.67.110:6080']

const OVERLAY_DEFS = [
  { key: 'predios', label: 'Predios', path: 'catastro/predios_cba', defaultOn: true },
  { key: 'vias', label: 'Vías', path: 'catastro/viasCertificado', defaultOn: false },
  { key: 'manzanas', label: 'Manzanas', path: 'catastro/manzanasWms', defaultOn: false },
]

function bboxToBounds(bbox) {
  const [minLon, minLat, maxLon, maxLat] = bbox.map(Number)
  return L.latLngBounds([minLat, minLon], [maxLat, maxLon])
}

function pixelToLatLng(x, y, bbox, width, height) {
  const [minLon, minLat, maxLon, maxLat] = bbox
  const lng = minLon + (x / width) * (maxLon - minLon)
  const lat = maxLat - (y / height) * (maxLat - minLat)
  return L.latLng(lat, lng)
}

function pixelBboxToBounds(px, bbox, width, height) {
  if (!px || px.length < 4 || !bbox || !(width > 0) || !(height > 0)) return null
  const [x0, y0, x1, y1] = px.map(Number)
  const a = pixelToLatLng(x0, y0, bbox, width, height)
  const b = pixelToLatLng(x1, y1, bbox, width, height)
  return L.latLngBounds(a, b)
}

function ensurePanes(map) {
  // tilePane=200, overlayPane=400 by default → orthophoto was covering the WMS.
  if (!map.getPane('orthoPane')) {
    map.createPane('orthoPane')
    map.getPane('orthoPane').style.zIndex = 350
  }
  if (!map.getPane('cadastralPane')) {
    map.createPane('cadastralPane')
    map.getPane('cadastralPane').style.zIndex = 450
    map.getPane('cadastralPane').style.pointerEvents = 'none'
  }
  if (!map.getPane('detectPane')) {
    map.createPane('detectPane')
    map.getPane('detectPane').style.zIndex = 550
  }
}

function vectorWms(gisHost, path) {
  return L.tileLayer.wms(`${gisHost}/arcgis/services/${path}/MapServer/WMSServer`, {
    layers: '0',
    format: 'image/png',
    transparent: true,
    version: '1.3.0',
    opacity: 0.9,
    maxZoom: 22,
    pane: 'cadastralPane',
  })
}

function tipoColor(tipo) {
  const t = String(tipo || '').toLowerCase()
  if (t.includes('nueva')) return '#72ae17'
  if (t.includes('elimin')) return '#d60035'
  return '#efbe00'
}

function applyOverlays(map, storeRef, layersOn, gisHost) {
  if (!map) return
  OVERLAY_DEFS.forEach(({ key, path }) => {
    const want = !!layersOn[key]
    let layer = storeRef.current[key]
    if (want) {
      if (!layer) {
        layer = vectorWms(gisHost, path)
        storeRef.current[key] = layer
      }
      if (!map.hasLayer(layer)) layer.addTo(map)
      // Re-bring to front within cadastral pane
      if (layer.bringToFront) {
        try {
          layer.bringToFront()
        } catch {
          /* ignore */
        }
      }
    } else if (layer && map.hasLayer(layer)) {
      map.removeLayer(layer)
    }
  })
}

/** Evidence A | B | Result with zoom and cadastral layers above the orthophoto. */
export default function ValidateEvidenceMaps({
  row,
  yearA,
  yearB,
  imageUrlA,
  imageUrlB,
  resultadoUrl,
  imgBbox,
  imgWidth,
  imgHeight,
  hosts = GIS_HOSTS,
}) {
  const mapANode = useRef(null)
  const mapBNode = useRef(null)
  const mapRNode = useRef(null)
  const mapARef = useRef(null)
  const mapBRef = useRef(null)
  const mapRRef = useRef(null)
  const overlaysARef = useRef({})
  const overlaysBRef = useRef({})
  const overlaysRRef = useRef({})
  const highlightRefs = useRef({ a: null, b: null, r: null })
  const syncingRef = useRef(false)
  const [ready, setReady] = useState(false)
  const [layersOn, setLayersOn] = useState(() =>
    Object.fromEntries(OVERLAY_DEFS.map((d) => [d.key, d.defaultOn]))
  )
  const [syncViews, setSyncViews] = useState(true)

  const gisHost = (hosts && hosts[0]) || GIS_HOSTS[0]
  const bboxOk = Array.isArray(imgBbox) && imgBbox.length === 4
  const sizeOk = Number(imgWidth) > 0 && Number(imgHeight) > 0
  const hasResultado = !!resultadoUrl

  // Init A/B (+ result if present)
  useEffect(() => {
    if (!imageUrlA || !imageUrlB || !bboxOk) return undefined
    if (!mapANode.current || !mapBNode.current) return undefined

    const bounds = bboxToBounds(imgBbox)
    const opts = {
      attributionControl: false,
      maxZoom: 22,
      minZoom: 12,
      zoomControl: true,
    }

    const mapA = L.map(mapANode.current, opts)
    const mapB = L.map(mapBNode.current, opts)
    ensurePanes(mapA)
    ensurePanes(mapB)
    mapARef.current = mapA
    mapBRef.current = mapB
    overlaysARef.current = {}
    overlaysBRef.current = {}

    L.imageOverlay(imageUrlA, bounds, {
      opacity: 1,
      interactive: false,
      pane: 'orthoPane',
    }).addTo(mapA)
    L.imageOverlay(imageUrlB, bounds, {
      opacity: 1,
      interactive: false,
      pane: 'orthoPane',
    }).addTo(mapB)

    let mapR = null
    if (hasResultado && mapRNode.current) {
      mapR = L.map(mapRNode.current, opts)
      ensurePanes(mapR)
      mapRRef.current = mapR
      overlaysRRef.current = {}
      L.imageOverlay(resultadoUrl, bounds, {
        opacity: 1,
        interactive: false,
        pane: 'orthoPane',
      }).addTo(mapR)
      mapR.fitBounds(bounds, { padding: [8, 8] })
    }

    mapA.fitBounds(bounds, { padding: [8, 8] })
    mapB.fitBounds(bounds, { padding: [8, 8] })

    setReady(true)
    requestAnimationFrame(() => {
      mapA.invalidateSize()
      mapB.invalidateSize()
      mapR?.invalidateSize()
    })

    return () => {
      setReady(false)
      mapA.remove()
      mapB.remove()
      mapR?.remove()
      mapARef.current = null
      mapBRef.current = null
      mapRRef.current = null
      overlaysARef.current = {}
      overlaysBRef.current = {}
      overlaysRRef.current = {}
      highlightRefs.current = { a: null, b: null, r: null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrlA, imageUrlB, resultadoUrl, hasResultado, bboxOk, String(imgBbox)])

  // Sync A ↔ B ↔ Result
  useEffect(() => {
    const maps = [mapARef.current, mapBRef.current, mapRRef.current].filter(Boolean)
    if (maps.length < 2 || !ready) return undefined

    function makeHandler(src) {
      return () => {
        if (syncingRef.current || !syncViews) return
        syncingRef.current = true
        const center = src.getCenter()
        const zoom = src.getZoom()
        maps.forEach((m) => {
          if (m !== src) m.setView(center, zoom, { animate: false })
        })
        syncingRef.current = false
      }
    }

    const handlers = maps.map((m) => {
      const h = makeHandler(m)
      m.on('move', h)
      return [m, h]
    })

    return () => {
      handlers.forEach(([m, h]) => m.off('move', h))
    }
  }, [syncViews, ready, hasResultado])

  // Layers above the orthophoto
  useEffect(() => {
    if (!ready) return
    applyOverlays(mapARef.current, overlaysARef, layersOn, gisHost)
    applyOverlays(mapBRef.current, overlaysBRef, layersOn, gisHost)
    if (mapRRef.current) applyOverlays(mapRRef.current, overlaysRRef, layersOn, gisHost)
  }, [ready, layersOn, gisHost, hasResultado])

  // Highlight + zoom to the finding
  useEffect(() => {
    const maps = [
      ['a', mapARef.current],
      ['b', mapBRef.current],
      ['r', mapRRef.current],
    ]
    if (!ready || !bboxOk) return

    maps.forEach(([key, map]) => {
      if (!map) return
      if (highlightRefs.current[key]) {
        map.removeLayer(highlightRefs.current[key])
        highlightRefs.current[key] = null
      }
    })

    const px = row?.bbox_px || row?.bbox
    const detBounds =
      sizeOk && px?.length >= 4
        ? pixelBboxToBounds(px, imgBbox, Number(imgWidth), Number(imgHeight))
        : null

    if (detBounds && detBounds.isValid()) {
      const color = tipoColor(row?.tipo || row?.tipo_cambio)
      const style = {
        color,
        weight: 3,
        fillColor: color,
        fillOpacity: 0.15,
        pane: 'detectPane',
      }
      syncingRef.current = true
      maps.forEach(([key, map]) => {
        if (!map) return
        highlightRefs.current[key] = L.rectangle(detBounds, style).addTo(map)
        map.fitBounds(detBounds.pad(1.2), { maxZoom: 21 })
      })
      syncingRef.current = false
    } else if (!row) {
      const bounds = bboxToBounds(imgBbox)
      syncingRef.current = true
      maps.forEach(([, map]) => {
        if (map) map.fitBounds(bounds, { padding: [8, 8] })
      })
      syncingRef.current = false
    }
  }, [row, ready, bboxOk, sizeOk, imgBbox, imgWidth, imgHeight, hasResultado])

  if (!imageUrlA || !imageUrlB) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10">
        <EmptyState
          title="Ortofotos no disponibles"
          subtitle="Ejecute una detección para cargar las imágenes alineadas A y B."
        />
      </div>
    )
  }

  if (!bboxOk) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10">
        <EmptyState
          title="Sin georreferencia del trabajo"
          subtitle="Este resultado no incluye bbox; no es posible superponer capas catastrales ni hacer zoom cartográfico."
        />
      </div>
    )
  }

  const tipo = row?.tipo || row?.tipo_cambio || '—'

  return (
    <div className="space-y-2">
      <LayerBar
        layersOn={layersOn}
        setLayersOn={setLayersOn}
        syncViews={syncViews}
        setSyncViews={setSyncViews}
        syncLabel={hasResultado ? 'Sincronizar A↔B↔Resultado' : 'Sincronizar A↔B'}
      />

      {!row ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3">
          <EmptyState
            icon={MousePointerClick}
            title="Seleccione un hallazgo"
            subtitle="El mapa hará zoom al cambio; predios/vías/manzanas quedan encima de la ortofoto."
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700 ring-1 ring-slate-200">
          <span className="font-bold uppercase text-slate-900">{String(tipo)}</span>
          {row.prob_pct != null && (
            <span className="font-semibold tabular-nums">{row.prob_pct}%</span>
          )}
          <span className="font-medium">{row.codigo_catastral || 'Sin código'}</span>
          <span className="text-slate-500">Capas encima de la imagen · rueda = zoom</span>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <MapPane nodeRef={mapANode} title={`A · referencia · ${yearA || '—'}`} />
        <MapPane nodeRef={mapBNode} title={`B · comparación · ${yearB || '—'}`} />
      </div>

      {hasResultado && (
        <MapPane
          nodeRef={mapRNode}
          title="Resultado global (detecciones) · zoom y capas"
          tall
        />
      )}
    </div>
  )
}

function LayerBar({ layersOn, setLayersOn, syncViews, setSyncViews, syncLabel }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {OVERLAY_DEFS.map((d) => (
        <label
          key={d.key}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 select-none hover:border-slate-300"
        >
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-800 focus:ring-accent-400"
            checked={!!layersOn[d.key]}
            onChange={(e) => setLayersOn((prev) => ({ ...prev, [d.key]: e.target.checked }))}
          />
          {d.label}
        </label>
      ))}
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 select-none">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-800"
          checked={syncViews}
          onChange={(e) => setSyncViews(e.target.checked)}
        />
        {syncLabel || 'Sincronizar A↔B'}
      </label>
    </div>
  )
}

function MapPane({ nodeRef, title, tall = false }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
      <div className="border-b border-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-white">
        {title}
      </div>
      <div
        ref={nodeRef}
        className={`w-full cursor-grab ${tall ? 'h-[280px] sm:h-[340px]' : 'h-[300px] sm:h-[360px]'}`}
      />
    </div>
  )
}

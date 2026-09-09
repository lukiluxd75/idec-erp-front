import { Component, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../styles/deteccion-precision-cursor.css'
import { Alert, Button } from '@/shared/ui'

const DEFAULT_CENTER = [-17.39325, -66.15625]
const DEFAULT_ZOOM = 17
const GIS_HOSTS = ['http://192.168.105.219:6080', 'http://172.16.67.110:6080']

const OVERLAY_DEFS = [
  { key: 'predios', label: 'Predios', path: 'catastro/predios_cba', defaultOn: true },
  { key: 'vias', label: 'Vías / calles', path: 'catastro/viasCertificado', defaultOn: true },
  { key: 'manzanas', label: 'Manzanas', path: 'catastro/manzanasWms', defaultOn: false },
]

function catastroWmsLayer(gisHost, service) {
  return L.tileLayer.wms(`${gisHost}/arcgis/services/imagenes/${service}/MapServer/WMSServer`, {
    layers: '0',
    format: 'image/png',
    transparent: false,
    version: '1.3.0',
    maxZoom: 20,
    attribution: 'Catastro GAMC · ortofoto',
  })
}

function googleSatelliteLayer() {
  return L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    attribution: 'Satélite',
  })
}

function osmLayer() {
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  })
}

function vectorWms(gisHost, path) {
  return L.tileLayer.wms(`${gisHost}/arcgis/services/${path}/MapServer/WMSServer`, {
    layers: '0',
    format: 'image/png',
    transparent: true,
    version: '1.3.0',
    opacity: 0.85,
    maxZoom: 20,
  })
}

function clearLeafletNode(node) {
  if (!node) return
  if (node._leaflet_id) {
    node._leaflet_id = undefined
    node.innerHTML = ''
  }
}

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <Alert
          type="warning"
          title="No se pudo cargar el mapa"
          message={`${this.state.error.message || 'Error desconocido'}. Recargue la página e intente nuevamente.`}
        />
      )
    }
    return this.props.children
  }
}

function LayerToggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 select-none hover:border-slate-300">
      <input
        type="checkbox"
        className="h-3.5 w-3.5 rounded border-slate-300 text-brand-800 focus:ring-accent-400"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

function DetectionMapInner({
  onPolygonChange,
  wmsLayers = [],
  hosts = GIS_HOSTS,
  basemapYear,
  onBasemapYearChange,
  height = 560,
}) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const drawnLayer = useRef(null)
  const baseLayer = useRef(null)
  const overlaysRef = useRef({})
  const pointsRef = useRef([])
  const onPolygonChangeRef = useRef(onPolygonChange)
  const [ready, setReady] = useState(false)
  const [layersOn, setLayersOn] = useState(() =>
    Object.fromEntries(OVERLAY_DEFS.map((d) => [d.key, d.defaultOn]))
  )
  onPolygonChangeRef.current = onPolygonChange

  const gisHost = (hosts && hosts[0]) || GIS_HOSTS[0]

  useEffect(() => {
    const node = mapRef.current
    if (!node) return undefined

    clearLeafletNode(node)

    let map
    try {
      map = L.map(node, { doubleClickZoom: false, zoomControl: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    } catch (err) {
      console.error('Leaflet init failed', err)
      clearLeafletNode(node)
      try {
        map = L.map(node, { doubleClickZoom: false, zoomControl: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
      } catch (err2) {
        console.error('Leaflet re-init failed', err2)
        return undefined
      }
    }

    mapInstance.current = map
    drawnLayer.current = L.layerGroup().addTo(map)
    overlaysRef.current = {}
    map.getContainer().classList.add('deteccion-precision-cursor')
    map.getContainer().style.cursor = 'crosshair'
    map.getContainer().title = 'Clic para agregar vértices del polígono'

    try {
      baseLayer.current = osmLayer().addTo(map)
    } catch (err) {
      console.error('OSM base failed', err)
    }

    const onClick = (event) => {
      const { lat, lng } = event.latlng
      pointsRef.current.push([lng, lat])
      redrawPolygon()
    }
    map.on('click', onClick)
    setReady(true)

    const t = setTimeout(() => {
      try {
        map.invalidateSize()
      } catch {
        /* ignore */
      }
    }, 150)

    return () => {
      clearTimeout(t)
      setReady(false)
      try {
        map.off('click', onClick)
        map.remove()
      } catch {
        /* ignore */
      }
      mapInstance.current = null
      drawnLayer.current = null
      baseLayer.current = null
      overlaysRef.current = {}
      clearLeafletNode(node)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ready || !mapInstance.current) return
    applyBasemap(basemapYear)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, basemapYear, wmsLayers, gisHost])

  useEffect(() => {
    const map = mapInstance.current
    if (!ready || !map) return

    OVERLAY_DEFS.forEach(({ key, path }) => {
      const want = !!layersOn[key]
      let layer = overlaysRef.current[key]
      try {
        if (want) {
          if (!layer) {
            layer = vectorWms(gisHost, path)
            overlaysRef.current[key] = layer
          }
          if (!map.hasLayer(layer)) layer.addTo(map)
        } else if (layer && map.hasLayer(layer)) {
          map.removeLayer(layer)
        }
      } catch (err) {
        console.warn(`Overlay ${key} skipped`, err)
      }
    })
  }, [ready, layersOn, gisHost])

  function safeRemoveLayer(map, layer) {
    if (!map || !layer) return
    try {
      if (map.hasLayer(layer)) map.removeLayer(layer)
    } catch {
      /* ignore */
    }
  }

  function applyBasemap(yearStr) {
    const map = mapInstance.current
    if (!map) return

    safeRemoveLayer(map, baseLayer.current)
    baseLayer.current = null

    const year = Number(yearStr)
    let next = null
    try {
      if (year === 2026) {
        next = googleSatelliteLayer()
      } else if (year) {
        const layer = (wmsLayers || []).find((x) => Number(x.year) === year)
        const service = layer?.service || 'imagen2023_500'
        next = catastroWmsLayer(gisHost, service)
      } else {
        next = osmLayer()
      }
      next.addTo(map)
      baseLayer.current = next
    } catch (err) {
      console.warn('Basemap failed, using OSM', err)
      try {
        safeRemoveLayer(map, next)
        next = osmLayer()
        next.addTo(map)
        baseLayer.current = next
      } catch (err2) {
        console.error('OSM fallback failed', err2)
      }
    }

    // Re-add overlays above the new basemap
    OVERLAY_DEFS.forEach(({ key }) => {
      const layer = overlaysRef.current[key]
      if (layer && layersOn[key]) {
        try {
          if (map.hasLayer(layer)) map.removeLayer(layer)
          layer.addTo(map)
        } catch {
          /* ignore */
        }
      }
    })
  }

  function redrawPolygon(emit = true) {
    const group = drawnLayer.current
    if (!group || typeof group.clearLayers !== 'function') return
    try {
      group.clearLayers()
      const pts = pointsRef.current
      pts.forEach(([lon, lat]) => {
        L.circleMarker([lat, lon], {
          radius: 5,
          color: '#007ea6',
          fillColor: '#009ed0',
          fillOpacity: 0.95,
        }).addTo(group)
      })
      if (pts.length >= 2) {
        L.polyline(
          pts.map(([lon, lat]) => [lat, lon]),
          { color: '#007ea6', weight: 2 }
        ).addTo(group)
      }
      if (pts.length >= 3) {
        L.polygon(
          pts.map(([lon, lat]) => [lat, lon]),
          { color: '#341a67', weight: 2, fillColor: '#009ed0', fillOpacity: 0.22 }
        ).addTo(group)
        if (emit && onPolygonChangeRef.current) onPolygonChangeRef.current([...pts, pts[0]])
      } else if (emit && onPolygonChangeRef.current) {
        onPolygonChangeRef.current(null)
      }
    } catch (err) {
      console.warn('redrawPolygon failed', err)
    }
  }

  function clearDrawing() {
    pointsRef.current = []
    redrawPolygon(true)
  }

  function setLayer(key, value) {
    setLayersOn((prev) => ({ ...prev, [key]: value }))
  }

  const yearChoices = (wmsLayers || []).map((l) => ({
    year: String(l.year),
    label: `${l.label || l.year} (${Number(l.year) === 2026 ? 'Satélite' : 'Catastro'})`,
  }))

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="space-y-2 border-b border-slate-200 bg-slate-50/90 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[200px] flex-1 sm:max-w-xs">
              <select
                aria-label="Capa base WMS"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-400/30"
                value={basemapYear || ''}
                onChange={(e) => onBasemapYearChange?.(e.target.value)}
              >
                {yearChoices.length === 0 ? (
                  <option value={basemapYear || '2023'}>{basemapYear || '2023'}</option>
                ) : (
                  yearChoices.map((o) => (
                    <option key={o.year} value={o.year}>
                      {o.label}
                    </option>
                  ))
                )}
              </select>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={clearDrawing}>
              Limpiar área
            </Button>
            <p className="text-[11px] font-medium text-slate-600 sm:ml-1">
              Pulse el mapa para dibujar · mínimo 3 vértices
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
              Capas
            </span>
            {OVERLAY_DEFS.map((d) => (
              <LayerToggle
                key={d.key}
                label={d.label}
                checked={!!layersOn[d.key]}
                onChange={(v) => setLayer(d.key, v)}
              />
            ))}
          </div>
        </div>
        <div
          ref={mapRef}
          style={{ height, width: '100%', minHeight: height, background: '#0a0d12', cursor: 'crosshair' }}
          className="deteccion-precision-cursor w-full"
          title="Clic para agregar vértices del polígono"
        />
      </div>
      {typeof window !== 'undefined' &&
        window.location?.protocol === 'https:' &&
        Number(basemapYear) !== 2026 && (
          <p className="px-1 text-[11px] leading-relaxed text-slate-500">
            Si la ortofoto Catastro no carga (HTTPS→HTTP), se muestra OpenStreetMap como respaldo.
            La detección continúa por el backend del ERP.
          </p>
        )}
    </div>
  )
}

export default function DetectionMap(props) {
  return (
    <MapErrorBoundary>
      <DetectionMapInner {...props} />
    </MapErrorBoundary>
  )
}

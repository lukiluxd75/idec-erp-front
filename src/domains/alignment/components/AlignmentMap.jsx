import { Component, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Alert } from '@/shared/ui'

const DEFAULT_CENTER = [-17.39325, -66.15625]
const DEFAULT_ZOOM = 17
const GIS_HOSTS = ['https://gs.catastrocbba.com', 'http://192.168.105.219:6080', 'http://172.16.67.110:6080']

const BLOCK_STYLE = { color: '#341a67', weight: 2, fillColor: '#009ed0', fillOpacity: 0.18 }
const REF_POINT_STYLE = { radius: 6, color: '#15803d', fillColor: '#22c55e', fillOpacity: 0.95 }
const MOV_POINT_STYLE = { radius: 6, color: '#b91c1c', fillColor: '#ef4444', fillOpacity: 0.95 }

const EXISTING_BLOCK_STYLE = {
  draft: { color: '#b45309', fillColor: '#f59e0b' },
  confirmed: { color: '#15803d', fillColor: '#22c55e' },
}

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

function prediosWmsLayer(gisHost) {
  return L.tileLayer.wms(`${gisHost}/arcgis/services/catastro/predios_cba/MapServer/WMSServer`, {
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

/**
 * Own map for the Alineación module -- not DetectionMap.jsx, not shared with
 * it (see the module's design: this is a completely separate module). Shows
 * either the fixed 2015 base or the year being corrected (basemapYear),
 * lets the architect draw a block polygon and mark control-point pairs, and
 * overlays already-drawn blocks colored by status.
 */
function AlignmentMapInner({
  wmsLayers = [],
  hosts = GIS_HOSTS,
  basemapYear,
  height = 560,
  mode = 'idle', // 'idle' | 'draw-block' | 'pick-point'
  blockRing = [],
  refPoints = [],
  movPoints = [],
  showRefPoints = false,
  showMovPoints = false,
  blocks = [],
  resultOverlay = null,
  onMapClick,
  onViewBlock,
}) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const blockLayer = useRef(null)
  const pointsLayer = useRef(null)
  const existingBlocksLayer = useRef(null)
  const resultLayer = useRef(null)
  const baseLayer = useRef(null)
  const prediosLayer = useRef(null)
  const onMapClickRef = useRef(onMapClick)
  const [ready, setReady] = useState(false)

  onMapClickRef.current = onMapClick

  const gisHost = (hosts && hosts[0]) || GIS_HOSTS[0]

  useEffect(() => {
    const node = mapRef.current
    if (!node) return undefined

    clearLeafletNode(node)
    let map
    try {
      map = L.map(node, { zoomControl: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    } catch (err) {
      console.error('AlignmentMap init failed', err)
      return undefined
    }

    mapInstance.current = map
    blockLayer.current = L.layerGroup().addTo(map)
    pointsLayer.current = L.layerGroup().addTo(map)
    existingBlocksLayer.current = L.layerGroup().addTo(map)
    resultLayer.current = L.layerGroup().addTo(map)

    try {
      baseLayer.current = osmLayer().addTo(map)
    } catch (err) {
      console.error('OSM base failed', err)
    }
    try {
      prediosLayer.current = prediosWmsLayer(gisHost).addTo(map)
    } catch (err) {
      console.warn('Predios overlay failed', err)
    }

    const onClick = (event) => {
      onMapClickRef.current?.([event.latlng.lng, event.latlng.lat])
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
      blockLayer.current = null
      pointsLayer.current = null
      existingBlocksLayer.current = null
      resultLayer.current = null
      baseLayer.current = null
      prediosLayer.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Basemap: satellite for 2026, catastro WMS by year otherwise, OSM as fallback.
  useEffect(() => {
    const map = mapInstance.current
    if (!ready || !map) return
    if (baseLayer.current && map.hasLayer(baseLayer.current)) map.removeLayer(baseLayer.current)

    const year = Number(basemapYear)
    let next
    try {
      if (year === 2026) {
        next = googleSatelliteLayer()
      } else if (year) {
        const layer = (wmsLayers || []).find((l) => Number(l.year) === year)
        const service = layer?.service
        next = service ? catastroWmsLayer(gisHost, service) : osmLayer()
      } else {
        next = osmLayer()
      }
      next.addTo(map)
      baseLayer.current = next
    } catch (err) {
      console.warn('Basemap failed, using OSM', err)
      next = osmLayer()
      next.addTo(map)
      baseLayer.current = next
    }
    if (prediosLayer.current && map.hasLayer(prediosLayer.current)) {
      map.removeLayer(prediosLayer.current)
      prediosLayer.current.addTo(map)
    }
  }, [ready, basemapYear, wmsLayers, gisHost])

  // Cursor feedback for whichever picking mode is active.
  useEffect(() => {
    const map = mapInstance.current
    if (!ready || !map) return
    const container = map.getContainer()
    container.style.cursor = mode === 'idle' ? '' : 'crosshair'
  }, [ready, mode])

  // Block polygon being drawn.
  useEffect(() => {
    const group = blockLayer.current
    if (!ready || !group) return
    group.clearLayers()
    blockRing.forEach(([lon, lat]) => {
      L.circleMarker([lat, lon], { radius: 5, color: '#007ea6', fillColor: '#009ed0', fillOpacity: 0.95 }).addTo(
        group
      )
    })
    if (blockRing.length >= 2) {
      L.polyline(
        blockRing.map(([lon, lat]) => [lat, lon]),
        { color: '#007ea6', weight: 2 }
      ).addTo(group)
    }
    if (blockRing.length >= 3) {
      L.polygon(
        blockRing.map(([lon, lat]) => [lat, lon]),
        BLOCK_STYLE
      ).addTo(group)
    }
  }, [ready, blockRing])

  // Control-point markers: ref points only make sense while looking at 2015,
  // mov points only while looking at the target year (see AlignmentPage).
  useEffect(() => {
    const group = pointsLayer.current
    if (!ready || !group) return
    group.clearLayers()
    if (showRefPoints) {
      refPoints.forEach((p, idx) => {
        L.circleMarker([p.lat_ref, p.lon_ref], REF_POINT_STYLE)
          .bindTooltip(String(idx + 1), { permanent: true, direction: 'top', className: 'font-bold' })
          .addTo(group)
      })
    }
    if (showMovPoints) {
      movPoints.forEach((p, idx) => {
        L.circleMarker([p.lat_mov, p.lon_mov], MOV_POINT_STYLE)
          .bindTooltip(String(idx + 1), { permanent: true, direction: 'top', className: 'font-bold' })
          .addTo(group)
      })
    }
  }, [ready, refPoints, movPoints, showRefPoints, showMovPoints])

  // Already-drawn blocks for the selected year.
  useEffect(() => {
    const group = existingBlocksLayer.current
    if (!ready || !group) return
    group.clearLayers()
    blocks.forEach((block) => {
      if (!block.geom_geojson) return
      const style = EXISTING_BLOCK_STYLE[block.status] || EXISTING_BLOCK_STYLE.draft
      const layer = L.geoJSON(block.geom_geojson, { style: { ...style, weight: 2, fillOpacity: 0.28 } })
      layer.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        onViewBlock?.(block)
      })
      layer.addTo(group)
    })
  }, [ready, blocks, onViewBlock])

  // The client-side-warped "after" image for whichever block the architect
  // asked to preview (see correctedOverlay.js) -- this is the actual visual
  // proof an alignment worked, not just its RMSE number.
  useEffect(() => {
    const group = resultLayer.current
    if (!ready || !group) return
    group.clearLayers()
    if (resultOverlay) {
      L.imageOverlay(resultOverlay.imageUrl, resultOverlay.bounds, { opacity: 0.95 }).addTo(group)
    }
  }, [ready, resultOverlay])

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%', minHeight: height, background: '#0a0d12' }}
      className="w-full rounded-2xl border border-slate-200"
    />
  )
}

export default function AlignmentMap(props) {
  return (
    <MapErrorBoundary>
      <AlignmentMapInner {...props} />
    </MapErrorBoundary>
  )
}

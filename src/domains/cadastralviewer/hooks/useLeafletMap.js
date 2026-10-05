import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { INITIAL_CENTER, INITIAL_ZOOM, MAX_ZOOM } from '../data/wmsConfig'

function createWmsLayer(record, transparent) {
  return L.tileLayer.wms(record.service_url, {
    layers: record.service_layer || '0',
    format: 'image/png',
    transparent,
    version: '1.1.1',
    crs: L.CRS.EPSG3857,
    maxZoom: MAX_ZOOM,
    tileSize: 256,
    uppercase: true,
    opacity: transparent ? 0.9 : 1,
    attribution: record.source || 'Catastro Cochabamba',
  })
}

export function useLeafletMap({ targetElement, active, layers, onFeatureInfo }) {
  const mapRef = useRef(null)
  const imageryLayerRef = useRef(null)
  const overlayLayersRef = useRef({})
  const markerRef = useRef(null)
  const searchFeatureRef = useRef(null)
  const onFeatureInfoRef = useRef(onFeatureInfo)
  const [initialized, setInitialized] = useState(false)
  const [year, setYear] = useState(null)
  const [isLoadingLayer, setIsLoadingLayer] = useState(false)
  const [coords, setCoords] = useState({ lat: INITIAL_CENTER[0], lng: INITIAL_CENTER[1], zoom: INITIAL_ZOOM })
  const [activeOverlays, setActiveOverlays] = useState({})
  const imageryLayers = useMemo(() => layers.filter((layer) => layer.layer_type === 'imagery' && layer.year), [layers])
  const vectorLayers = useMemo(() => layers.filter((layer) => layer.layer_type === 'vector'), [layers])
  const years = useMemo(() => [...new Set(imageryLayers.map((layer) => layer.year))].sort((a, b) => b - a), [imageryLayers])
  const selectedYear = years.includes(year) ? year : years[0] ?? null

  useEffect(() => { onFeatureInfoRef.current = onFeatureInfo }, [onFeatureInfo])

  useEffect(() => {
    if (!active || mapRef.current || !targetElement) return undefined
    const map = L.map(targetElement, {
      zoomControl: false,
      attributionControl: false,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      zoomSnap: 0.5,
      maxZoom: MAX_ZOOM,
    })
    mapRef.current = map
    map.on('mousemove', (event) => setCoords({ lat: event.latlng.lat, lng: event.latlng.lng, zoom: map.getZoom() }))
    map.on('move', () => {
      const center = map.getCenter()
      setCoords({ lat: center.lat, lng: center.lng, zoom: map.getZoom() })
    })
    setInitialized(true)
    return () => {
      map.remove()
      mapRef.current = null
      imageryLayerRef.current = null
      overlayLayersRef.current = {}
      markerRef.current = null
      searchFeatureRef.current = null
      setInitialized(false)
    }
  }, [active, targetElement])

  useEffect(() => {
    const map = mapRef.current
    if (!active || !initialized || !map) return undefined
    const imagery = imageryLayers.find((layer) => layer.year === selectedYear) || imageryLayers[0]
    if (!imagery) {
      if (imageryLayerRef.current) map.removeLayer(imageryLayerRef.current)
      imageryLayerRef.current = null
      return undefined
    }
    if (imageryLayerRef.current) map.removeLayer(imageryLayerRef.current)
    const nextLayer = createWmsLayer(imagery, false)
    const animationId = window.requestAnimationFrame(() => setIsLoadingLayer(true))
    let firstLoad = true
    const finishLoading = () => {
      if (!firstLoad) return
      firstLoad = false
      setIsLoadingLayer(false)
    }
    nextLayer.once('load', finishLoading)
    const timeoutId = window.setTimeout(finishLoading, 5000)
    nextLayer.addTo(map)
    nextLayer.bringToBack()
    imageryLayerRef.current = nextLayer
    return () => {
      window.cancelAnimationFrame(animationId)
      window.clearTimeout(timeoutId)
    }
  }, [active, initialized, imageryLayers, selectedYear])

  useEffect(() => {
    const map = mapRef.current
    if (!active || !initialized || !map) return
    Object.values(overlayLayersRef.current).forEach((layer) => map.removeLayer(layer))
    overlayLayersRef.current = {}
    vectorLayers.forEach((record) => {
      if (!activeOverlays[record.code]) return
      const layer = createWmsLayer(record, true).addTo(map)
      layer.bringToFront()
      overlayLayersRef.current[record.code] = layer
    })
  }, [active, initialized, vectorLayers, activeOverlays])

  useEffect(() => {
    const map = mapRef.current
    if (!active || !initialized || !map) return undefined

    let controller
    const handleMapClick = async (event) => {
      const parcelLayer = vectorLayers.find((layer) => layer.code === 'predios' && activeOverlays[layer.code])
      if (!parcelLayer) return

      controller?.abort()
      controller = new AbortController()
      onFeatureInfoRef.current?.({ loading: true, feature: null, error: '' })

      const size = map.getSize()
      const point = map.latLngToContainerPoint(event.latlng)
      const bounds = map.getBounds()
      const southwest = map.options.crs.project(bounds.getSouthWest())
      const northeast = map.options.crs.project(bounds.getNorthEast())
      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.1.1',
        REQUEST: 'GetFeatureInfo',
        SRS: 'EPSG:3857',
        BBOX: `${southwest.x},${southwest.y},${northeast.x},${northeast.y}`,
        WIDTH: String(size.x),
        HEIGHT: String(size.y),
        LAYERS: parcelLayer.service_layer || '0',
        QUERY_LAYERS: parcelLayer.service_layer || '0',
        STYLES: '',
        FORMAT: 'image/png',
        INFO_FORMAT: 'application/geojson',
        FEATURE_COUNT: '5',
        X: String(Math.round(point.x)),
        Y: String(Math.round(point.y)),
      })

      try {
        const response = await fetch(`${parcelLayer.service_url}?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`El servicio catastral respondió ${response.status}.`)
        const result = await response.json()
        const feature = result.features?.[0] || null
        onFeatureInfoRef.current?.({
          loading: false,
          feature,
          error: feature ? '' : 'No se encontró información para el predio seleccionado.',
        })
      } catch (error) {
        if (error.name === 'AbortError') return
        onFeatureInfoRef.current?.({
          loading: false,
          feature: null,
          error: error?.message || 'No se pudo consultar la información del predio.',
        })
      }
    }

    map.on('click', handleMapClick)
    return () => {
      map.off('click', handleMapClick)
      controller?.abort()
    }
  }, [active, activeOverlays, initialized, vectorLayers])

  useEffect(() => {
    if (!initialized || !active || !mapRef.current) return undefined
    const timeoutId = window.setTimeout(() => mapRef.current?.invalidateSize(), 100)
    return () => window.clearTimeout(timeoutId)
  }, [active, initialized])

  const changeYear = useCallback((targetYear) => setYear(Number(targetYear)), [])
  const toggleOverlay = useCallback((code) => setActiveOverlays((current) => ({ ...current, [code]: !current[code] })), [])
  const zoomIn = useCallback(() => mapRef.current?.zoomIn(), [])
  const zoomOut = useCallback(() => mapRef.current?.zoomOut(), [])
  const recenter = useCallback(() => mapRef.current?.flyTo(INITIAL_CENTER, INITIAL_ZOOM, { duration: 1 }), [])
  const flyToProperty = useCallback((property) => {
    const map = mapRef.current
    if (!map || !Number.isFinite(Number(property.lat)) || !Number.isFinite(Number(property.lng))) return
    markerRef.current?.remove()
    const icon = L.divIcon({ className: 'vc-pin', html: '<span></span>', iconSize: [22, 22], iconAnchor: [11, 11] })
    markerRef.current = L.marker([Number(property.lat), Number(property.lng)], { icon }).addTo(map)
    map.flyTo([Number(property.lat), Number(property.lng)], 19, { duration: 1.2 })
  }, [])
  const clearMarker = useCallback(() => {
    markerRef.current?.remove()
    markerRef.current = null
  }, [])
  const focusGeometry = useCallback((geometry) => {
    const map = mapRef.current
    if (!map || !geometry) return
    searchFeatureRef.current?.remove()
    const feature = L.geoJSON({ type: 'Feature', geometry }, {
      style: { color: '#d97706', weight: 3, fillColor: '#f0a832', fillOpacity: 0.16 },
    })
    const bounds = feature.getBounds()
    if (!bounds.isValid()) return
    searchFeatureRef.current = feature.addTo(map)
    map.flyToBounds(bounds.pad(0.18), { maxZoom: 19, duration: 1 })
  }, [])

  return { year: selectedYear, years, isLoadingLayer, coords, activeOverlays, changeYear, toggleOverlay, zoomIn, zoomOut, recenter, flyToProperty, clearMarker, focusGeometry }
}
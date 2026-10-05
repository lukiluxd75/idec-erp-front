import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { createProcessedSectorsLayer, renderProcessedSectors } from '../utils/processedSectorsLayer'
import { createParcelHighlightLayer, renderParcelHighlight } from '../utils/parcelHighlightLayer'

const DEFAULT_CENTER = [-17.39325, -66.15625]
const DEFAULT_ZOOM = 15

function clearLeafletNode(node) {
  if (!node) return
  if (node._leaflet_id) {
    node._leaflet_id = undefined
    node.innerHTML = ''
  }
}

export default function HistorialMap({
  processedSectors = [],
  onViewSectorDetail,
  height = 560,
  highlightParcelGeom = null,
}) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const processedLayer = useRef(null)
  const highlightLayer = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const node = mapRef.current
    if (!node) return undefined

    clearLeafletNode(node)
    let map
    try {
      map = L.map(node, { zoomControl: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    } catch (err) {
      console.error('HistorialMap init failed', err)
      return undefined
    }
    mapInstance.current = map
    processedLayer.current = createProcessedSectorsLayer(map)
    highlightLayer.current = createParcelHighlightLayer(map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map)
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
        map.remove()
      } catch {
        /* ignore */
      }
      mapInstance.current = null
      processedLayer.current = null
      highlightLayer.current = null
      clearLeafletNode(node)
    }
  }, [])

  useEffect(() => {
    if (!ready || !mapInstance.current || !processedLayer.current) return
    renderProcessedSectors(mapInstance.current, processedLayer.current, processedSectors, onViewSectorDetail)
  }, [ready, processedSectors, onViewSectorDetail])

  useEffect(() => {
    if (!ready || !mapInstance.current || !highlightLayer.current) return
    renderParcelHighlight(mapInstance.current, highlightLayer.current, highlightParcelGeom)
  }, [ready, highlightParcelGeom])

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%', minHeight: height, background: '#0a0d12' }}
      className="w-full rounded-2xl border border-slate-200"
    />
  )
}

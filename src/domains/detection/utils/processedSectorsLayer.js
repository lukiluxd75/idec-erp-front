import L from 'leaflet'

/**
 * Shared Leaflet overlay for "sectores ya procesados" -- used by
 * DetectionMap ("Mapa y detección", operational: avoid redrawing over
 * covered areas). Historial dropped its own map entirely (audit/consulta
 * tool now, not a second place to browse the same polygons -- see
 * HistorialPage), so this is DetectionMap's alone these days. Plain
 * Leaflet (no react-leaflet in this project), matching DetectionMap's own
 * imperative style.
 *
 * Polygon color is the VALIDATION OUTCOME of the sector's most recent run
 * (n_confirmed_parcels/n_rejected_parcels from the backend), not its pipeline
 * status: green = the architect confirmed real changes and rejected none,
 * red = every finding was rejected (the model was wrong there), orange = a
 * mix of both, grey = nothing reviewed yet (or still processing/error).
 */
const COLORS = {
  good: { color: '#15803d', fillColor: '#22c55e' }, // confirmed-only
  bad: { color: '#b91c1c', fillColor: '#ef4444' }, // rejected-only
  mixed: { color: '#b45309', fillColor: '#f59e0b' }, // confirmed + rejected
  unreviewed: { color: '#475569', fillColor: '#94a3b8' }, // pending / in progress / error
}

const STATUS_LABELS = {
  completed: 'Procesado',
  awaiting_validation: 'Pendiente de validación',
  awaiting_manual_alignment: 'Requiere alineación manual',
  detecting: 'En proceso',
  error: 'Error',
}

function styleForSector(sector) {
  if (sector.status === 'detecting' || sector.status === 'error') return COLORS.unreviewed
  const confirmed = sector.n_confirmed_parcels || 0
  const rejected = sector.n_rejected_parcels || 0
  if (confirmed === 0 && rejected === 0) return COLORS.unreviewed
  if (rejected === 0) return COLORS.good
  if (confirmed === 0) return COLORS.bad
  return COLORS.mixed
}

/** Ray-casting point-in-polygon test. */
export function pointInRing(lat, lon, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function orientation(p, q, r) {
  const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1])
  if (Math.abs(val) < 1e-12) return 0
  return val > 0 ? 1 : 2
}

function onSegment(p, q, r) {
  return (
    Math.min(p[0], r[0]) <= q[0] &&
    q[0] <= Math.max(p[0], r[0]) &&
    Math.min(p[1], r[1]) <= q[1] &&
    q[1] <= Math.max(p[1], r[1])
  )
}

function segmentsIntersect(p1, p2, p3, p4) {
  const o1 = orientation(p1, p2, p3)
  const o2 = orientation(p1, p2, p4)
  const o3 = orientation(p3, p4, p1)
  const o4 = orientation(p3, p4, p2)
  if (o1 !== o2 && o3 !== o4) return true
  if (o1 === 0 && onSegment(p1, p3, p2)) return true
  if (o2 === 0 && onSegment(p1, p4, p2)) return true
  if (o3 === 0 && onSegment(p3, p1, p4)) return true
  if (o4 === 0 && onSegment(p3, p2, p4)) return true
  return false
}

function ringsIntersect(ringA, ringB) {
  if (ringA.some(([lon, lat]) => pointInRing(lat, lon, ringB))) return true
  if (ringB.some(([lon, lat]) => pointInRing(lat, lon, ringA))) return true
  for (let i = 0; i < ringA.length - 1; i++) {
    for (let j = 0; j < ringB.length - 1; j++) {
      if (segmentsIntersect(ringA[i], ringA[i + 1], ringB[j], ringB[j + 1])) return true
    }
  }
  return false
}

export function findOverlappingSector(newPoint, existingPoints, sectors) {
  const list = (sectors || []).filter((s) => s.geom_geojson?.coordinates?.[0])
  if (!list.length) return null

  const [lon, lat] = newPoint
  const pointHit = list.find((s) => pointInRing(lat, lon, s.geom_geojson.coordinates[0]))
  if (pointHit) return pointHit

  const candidate = [...existingPoints, newPoint]
  if (candidate.length < 3) return null
  const closedRing = [...candidate, candidate[0]]
  return list.find((s) => ringsIntersect(closedRing, s.geom_geojson.coordinates[0])) || null
}

/** Every sector (of the ones currently rendered) whose polygon contains `latlng` -- resolves overlaps (e.g. */
export function sectorsContainingLatLng(sectors, latlng) {
  return (sectors || []).filter((s) => {
    const ring = s.geom_geojson?.coordinates?.[0]
    return ring && pointInRing(latlng.lat, latlng.lng, ring)
  })
}

export function createProcessedSectorsLayer(map) {
  return L.layerGroup().addTo(map)
}

function sectorPickerHtml(matches) {
  const items = matches
    .map((s, idx) => {
      const label = STATUS_LABELS[s.status] || s.status
      return `<button data-idx="${idx}" style="display:block;width:100%;text-align:left;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:6px 8px;margin-bottom:4px;font-size:11px;font-weight:600;color:#0f172a;cursor:pointer">${
        s.name || `Sector #${s.id}`
      } · ${s.year_a}→${s.year_b} · ${label}</button>`
    })
    .join('')
  const header =
    matches.length > 1
      ? `<p style="font-weight:700;font-size:11px;margin:0 0 6px;color:#475569">${matches.length} sectores se superponen aquí — elija cuál ver:</p>`
      : ''
  return `<div style="min-width:210px;font-family:inherit">${header}<div>${items}</div></div>`
}

/** (Re)draws every processed sector as a polygon. */
export function renderProcessedSectors(map, group, sectors, onViewDetail) {
  if (!group) return
  group.clearLayers()
  ;(sectors || []).forEach((sector) => {
    if (!sector.geom_geojson) return
    const style = styleForSector(sector)
    const layer = L.geoJSON(sector.geom_geojson, {
      style: { ...style, weight: 2, fillOpacity: 0.3 },
    })
    layer.on('click', (e) => {
      L.DomEvent.stopPropagation(e) // do not also add a drawing vertex here
      const matches = sectorsContainingLatLng(sectors, e.latlng)
      const shown = matches.length ? matches : [sector]
      const popup = L.popup({ maxWidth: 280 }).setLatLng(e.latlng).setContent(sectorPickerHtml(shown))
      map.once('popupopen', (evt) => {
        const el = evt.popup.getElement()
        shown.forEach((s, idx) => {
          const btn = el?.querySelector(`[data-idx="${idx}"]`)
          if (btn) {
            btn.onclick = () => {
              onViewDetail?.(s.id)
              map.closePopup(popup)
            }
          }
        })
      })
      popup.openOn(map)
    })
    layer.addTo(group)
  })
}

export function polygonRingFromGeoJson(geomGeojson) {
  const ring = geomGeojson?.coordinates?.[0]
  return Array.isArray(ring) ? ring : null
}

export function applyParcelReviewToSectors(sectors, sectorId, validationStatus) {
  return (sectors || []).map((s) => {
    if (s.id !== sectorId) return s
    const isConfirmed = validationStatus === 'confirmed'
    const nPending = Math.max(0, (s.n_pending_parcels || 0) - 1)
    const completable = s.status === 'awaiting_validation' || s.status === 'awaiting_manual_alignment'
    return {
      ...s,
      n_confirmed_parcels: (s.n_confirmed_parcels || 0) + (isConfirmed ? 1 : 0),
      n_rejected_parcels: (s.n_rejected_parcels || 0) + (isConfirmed ? 0 : 1),
      n_pending_parcels: nPending,
      status: nPending === 0 && completable ? 'completed' : s.status,
    }
  })
}

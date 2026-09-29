import L from 'leaflet'

/**
 * Shared Leaflet overlay for "sectores ya procesados" -- used by both
 * DetectionMap ("Mapa y detección", operational: avoid redrawing over
 * covered areas) and HistorialMap ("Historial", read-only browsing). Plain
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

/** Ray-casting point-in-polygon test. `ring` is a GeoJSON linear ring
 * ([lon,lat] pairs) -- exterior ring only, holes are not expected on
 * detection sector polygons. */
function pointInRing(lat, lon, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/** Every sector (of the ones currently rendered) whose polygon contains
 * `latlng` -- resolves overlaps (e.g. one architect's 1-block sector inside
 * another's 4-block sector) instead of Leaflet silently picking whichever
 * layer happens to be on top. */
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

/**
 * (Re)draws every processed sector as a polygon. Click handling is done
 * manually (own point-in-polygon test against every rendered sector, see
 * sectorsContainingLatLng) instead of one bindPopup() per layer: Leaflet only
 * routes a click to whichever layer is topmost when shapes overlap, which
 * silently hides the other sector(s) at that point.
 */
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

/** A processed sector's stored GeoJSON Polygon -> the [[lon,lat], ...] ring
 * DetectionMap's own click-to-draw state uses, for "Reprocesar". */
export function polygonRingFromGeoJson(geomGeojson) {
  const ring = geomGeojson?.coordinates?.[0]
  return Array.isArray(ring) ? ring : null
}

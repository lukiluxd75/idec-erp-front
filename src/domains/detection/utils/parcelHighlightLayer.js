import L from 'leaflet'

/**
 * Single-feature highlight overlay for "ver predio en el mapa" (see
 * ProcessedSectorDetailModal -> onViewParcel): draws one parcel's real
 * cadastral polygon (affected_parcel.parcel_geom, already stored in WGS84 --
 * not the detection's change bbox) and zooms the map to it. Separate from
 * processedSectorsLayer.js on purpose: that one renders many sector polygons
 * at once, this one always renders at most one parcel.
 */
const STYLE = { color: '#7c3aed', weight: 3, fillColor: '#a855f7', fillOpacity: 0.35 }

export function createParcelHighlightLayer(map) {
  return L.layerGroup().addTo(map)
}

/** Clears the layer when `geomGeojson` is null -- callers pass null to
 * dismiss a previous highlight without drawing a new one. */
export function renderParcelHighlight(map, group, geomGeojson) {
  if (!group) return
  group.clearLayers()
  if (!geomGeojson) return
  const layer = L.geoJSON(geomGeojson, { style: STYLE })
  layer.addTo(group)
  const bounds = layer.getBounds()
  if (bounds.isValid()) {
    map.fitBounds(bounds, { maxZoom: 20, padding: [60, 60] })
  }
}

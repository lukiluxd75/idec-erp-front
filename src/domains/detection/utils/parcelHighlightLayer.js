import L from 'leaflet'

const STYLE = { color: '#7c3aed', weight: 3, fillColor: '#a855f7', fillOpacity: 0.35 }

export function createParcelHighlightLayer(map) {
  return L.layerGroup().addTo(map)
}

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

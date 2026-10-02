import { useEffect, useMemo, useState } from 'react'
import { FileText, Layers3, LocateFixed, Search, X } from 'lucide-react'
import { cadastralViewerApi } from '../api/cadastralViewerApi'
import { useLeafletMap } from '../hooks/useLeafletMap';
import MapControls from './MapControls';

const PANEL_ITEMS = [
  { id: 'search', label: 'Buscar', icon: Search },
  { id: 'procedures', label: 'Trámites', icon: FileText },
  { id: 'layers', label: 'Capas', icon: Layers3 },
  { id: 'years', label: 'Años', icon: '◷' },
]
const STOREFRONT_VECTOR_CODES = new Set(['manzanas', 'vias', 'predios'])

export default function MapOverlay({ visible, layers = [], procedures = [], onClose, onActivity }) {
  const [mapElement, setMapElement] = useState(null)
  const [activePanel, setActivePanel] = useState('')
  const [query, setQuery] = useState('')
  const [searchKind, setSearchKind] = useState('parcel')
  const [mapSearchState, setMapSearchState] = useState({ query: '', kind: 'parcel', results: [], isLoading: false, error: '' })
  const [procedureQuery, setProcedureQuery] = useState('')
  const [selectedProcedure, setSelectedProcedure] = useState(null)
  const map = useLeafletMap({ targetElement: mapElement, active: visible, layers })
  const vectorLayers = layers.filter((layer) => layer.layer_type === 'vector' && STOREFRONT_VECTOR_CODES.has(layer.code))
  const currentSearch = mapSearchState.query === query.trim() && mapSearchState.kind === searchKind
  const mapSearchResults = currentSearch ? mapSearchState.results : []
  const isSearching = currentSearch && mapSearchState.isLoading
  const searchError = currentSearch ? mapSearchState.error : ''
  const filteredProcedures = useMemo(() => {
    const term = procedureQuery.trim().toLocaleLowerCase('es')
    if (!term) return procedures
    return procedures.filter((procedure) =>
      [procedure.name, procedure.description, procedure.category]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase('es').includes(term))
    )
  }, [procedureQuery, procedures])

  useEffect(() => {
    const term = query.trim()
    if (activePanel !== 'search' || term.length < 2) return undefined

    let current = true
    const timeoutId = window.setTimeout(() => {
      setMapSearchState({ query: term, kind: searchKind, results: [], isLoading: true, error: '' })
      cadastralViewerApi.searchMapFeatures(searchKind, term)
        .then((results) => { if (current) setMapSearchState({ query: term, kind: searchKind, results, isLoading: false, error: '' }) })
        .catch((error) => { if (current) setMapSearchState({ query: term, kind: searchKind, results: [], isLoading: false, error: error?.message || 'No se pudo consultar el servicio catastral.' }) })
    }, 250)

    return () => {
      current = false
      window.clearTimeout(timeoutId)
    }
  }, [activePanel, query, searchKind])

  function togglePanel(panel) {
    setSelectedProcedure(null)
    setActivePanel((current) => current === panel ? '' : panel)
  }

  return (
    <div className={`vc-map-overlay vc-map-fullscreen ${visible ? 'show' : ''}`}
      onPointerDown={onActivity} onPointerMove={onActivity} onKeyDown={onActivity} onWheel={onActivity} onTouchStart={onActivity}>
      <div ref={setMapElement} id="vc-map" />
      <div className={`vc-layer-loader ${map.isLoadingLayer ? 'show' : ''}`}><div className="vc-spin" /><span>Cargando capa…</span></div>

      <header className="vc-map-main-header">
        <div className="vc-map-brand"><span className="vc-brand-mark">G</span><div><b>Visor Catastral</b><small>GAMC · Cochabamba</small></div></div>
        <div className="vc-map-header-actions">
          <div className="vc-map-year-indicator">{map.year ? `Imagen ${map.year}` : 'Sin imagen satelital configurada'}</div>
          <button type="button" className="vc-map-close" onClick={onClose} aria-label="Cerrar mapa" title="Cerrar mapa"><X size={19} /></button>
        </div>
      </header>

      <nav className="vc-map-side-actions" aria-label="Herramientas del mapa">
        {PANEL_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-label={label} title={label}
          aria-pressed={activePanel === id} className={activePanel === id ? 'active' : ''} onClick={() => togglePanel(id)}>
          {typeof Icon === 'string' ? <span className="vc-action-glyph">{Icon}</span> : <Icon size={20} strokeWidth={2} />}
          <small>{label}</small>
        </button>)}
        <button type="button" aria-label="Centrar en Cochabamba" title="Centrar en Cochabamba" onClick={map.recenter}><LocateFixed size={20} /><small>Centro</small></button>
      </nav>

      {activePanel && <section className="vc-map-panel" aria-label={`Panel ${PANEL_ITEMS.find((item) => item.id === activePanel)?.label || ''}`}>
        <header className="vc-map-panel-head"><div><span>VISOR CATASTRAL</span><h2>{activePanel === 'search' ? 'Buscar predio o calle' : activePanel === 'procedures' ? 'Trámites municipales' : activePanel === 'layers' ? 'Capas del mapa' : 'Imágenes por año'}</h2></div>
          <button type="button" onClick={() => setActivePanel('')} aria-label="Cerrar panel"><X size={18} /></button></header>

        <div className="vc-map-panel-body">
          {activePanel === 'search' && <>
            <div className="vc-search-segment" role="group" aria-label="Tipo de búsqueda">
              <button type="button" aria-pressed={searchKind === 'parcel'} className={searchKind === 'parcel' ? 'selected' : ''} onClick={() => { setSearchKind('parcel'); setQuery('') }}>Predio</button>
              <button type="button" aria-pressed={searchKind === 'street'} className={searchKind === 'street' ? 'selected' : ''} onClick={() => { setSearchKind('street'); setQuery('') }}>Calle</button>
            </div>
            <label className="vc-map-search"><Search size={17} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchKind === 'parcel' ? 'Código catastral…' : 'Nombre de calle…'} /><button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda">×</button></label>
            {query.trim().length === 1 && <p className="vc-search-message">Escribe al menos 2 caracteres para buscar.</p>}
            {isSearching && <p className="vc-search-message" role="status">Buscando en Catastro Municipal…</p>}
            {searchError && <p className="vc-search-error" role="alert">{searchError}</p>}
            {!isSearching && !searchError && query.trim().length >= 2 && mapSearchResults.length === 0 && <p className="vc-panel-empty">No se encontraron {searchKind === 'parcel' ? 'predios' : 'calles'}.</p>}
            {mapSearchResults.map((result) => <button key={`${result.kind}-${result.id}`} className="vc-catalog-result" type="button" onClick={() => map.focusGeometry(result.geometry)}><span className="vc-result-icon">{result.kind === 'parcel' ? '🏠' : '🛣️'}</span><span><b>{result.title}</b><small>{result.subtitle}</small></span><span className="vc-result-arrow">›</span></button>)}
          </>}

          {activePanel === 'procedures' && (selectedProcedure ? <div className="vc-procedure-detail"><button type="button" className="vc-back-link" onClick={() => setSelectedProcedure(null)}>← Todos los trámites</button><span className="vc-procedure-icon">{selectedProcedure.icon || '📋'}</span><h3>{selectedProcedure.name}</h3><p>{selectedProcedure.description || 'Consulta los requisitos en la oficina municipal correspondiente.'}</p><dl><div><dt>Plazo estimado</dt><dd>{selectedProcedure.estimated_days || 'No especificado'}</dd></div><div><dt>Ubicación</dt><dd>{selectedProcedure.location || 'No especificada'}</dd></div></dl>{selectedProcedure.requirements?.length > 0 && <><h4>Requisitos</h4><ul>{selectedProcedure.requirements.map((requirement, index) => <li key={`${requirement}-${index}`}>{requirement}</li>)}</ul></>}</div> : <>
            <label className="vc-map-search"><Search size={17} /><input value={procedureQuery} onChange={(event) => setProcedureQuery(event.target.value)} placeholder="Buscar trámite…" /><button type="button" onClick={() => setProcedureQuery('')} aria-label="Limpiar búsqueda">×</button></label>
            {filteredProcedures.length ? filteredProcedures.map((procedure) => <button key={procedure.id} className="vc-catalog-result" type="button" onClick={() => setSelectedProcedure(procedure)}><span className="vc-result-icon">{procedure.icon || '📋'}</span><span><b>{procedure.name}</b><small>{procedure.estimated_days || 'Plazo no indicado'} · {procedure.location || procedure.category}</small></span><span className="vc-result-arrow">›</span></button>) : <p className="vc-panel-empty">{procedureQuery ? 'No se encontraron trámites.' : 'No hay trámites publicados.'}</p>}
          </>)}

          {activePanel === 'layers' && <div className="vc-map-layer-list">{vectorLayers.length ? vectorLayers.map((layer) => <button key={layer.id} type="button" className={`vc-map-layer-option ${map.activeOverlays[layer.code] ? 'selected' : ''}`} onClick={() => map.toggleOverlay(layer.code)}><span className="vc-layer-check">{map.activeOverlays[layer.code] ? '✓' : ''}</span><span><b>{layer.name}</b><small>{layer.source || 'Catastro Municipal'}</small></span></button>) : <p className="vc-panel-empty">No hay capas de manzanas, vías o predios configuradas.</p>}</div>}

          {activePanel === 'years' && <div className="vc-map-years">{map.years.map((year) => <button key={year} type="button" className={map.year === year ? 'selected' : ''} onClick={() => map.changeYear(year)}>{year}</button>)}{map.years.length === 0 && <p className="vc-panel-empty">No hay imágenes satelitales con año configurado.</p>}</div>}

        </div>
      </section>}

      <MapControls onZoomIn={map.zoomIn} onZoomOut={map.zoomOut} onRecenter={map.recenter} />
      <div className="vc-coords">{map.coords.lat.toFixed(5)}, {map.coords.lng.toFixed(5)} · <b>z{map.coords.zoom}</b></div>
    </div>
  )
}
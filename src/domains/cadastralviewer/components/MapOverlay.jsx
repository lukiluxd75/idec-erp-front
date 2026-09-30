import { useEffect, useState } from 'react';
import { useLeafletMap } from '../hooks/useLeafletMap';
import SearchBar from './SearchBar';
import YearSelector from './YearSelector';
import OverlayChips from './OverlayChips';
import MapControls from './MapControls';
import PropertyCard from './PropertyCard';

const MAP_IDLE_TIMEOUT_MS = 15_000;

// Narrow map overlay with search, year switcher, layer chips and property card.
export default function MapOverlay({
  visible,
  onClose,
  selectedProperty,
  onSelectProperty
}) {
  const [mapElement, setMapElement] = useState(null);

  const {
    year,
    isLoadingLayer,
    coords,
    activeOverlays,
    changeYear,
    toggleOverlay,
    zoomIn,
    zoomOut,
    recenter,
    flyToProperty,
    clearMarker
  } = useLeafletMap({
    targetElement: mapElement,
    active: visible
  });

  useEffect(() => {
    if (selectedProperty && visible) flyToProperty(selectedProperty);
    if (!selectedProperty) clearMarker();
  }, [selectedProperty, visible, flyToProperty, clearMarker]);

  useEffect(() => {
    const overlay = mapElement?.parentElement;
    if (!visible || !overlay) return undefined;

    let timeoutId;
    const resetIdleTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(onClose, MAP_IDLE_TIMEOUT_MS);
    };
    const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];

    activityEvents.forEach((eventName) => overlay.addEventListener(eventName, resetIdleTimer));
    resetIdleTimer();

    return () => {
      window.clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => overlay.removeEventListener(eventName, resetIdleTimer));
    };
  }, [visible, mapElement, onClose]);

  return (
    <div className={`vc-map-overlay ${visible ? 'show' : ''}`}>
      <div ref={setMapElement} id="vc-map" />

      <div className={`vc-layer-loader ${isLoadingLayer ? 'show' : ''}`}>
        <div className="vc-spin" />
        <span>Cargando capa…</span>
      </div>

      <div className="vc-map-top">
        <div className="vc-top-row">
          <button
            type="button"
            className="vc-close-btn"
            onClick={onClose}
            aria-label="Cerrar mapa"
          >✕</button>
          <div className="vc-title-map">
            <b>Visor catastral</b>
            Cochabamba · Imagen satelital
          </div>
        </div>

        <SearchBar onSelectProperty={onSelectProperty} />
        <YearSelector currentYear={year} onChange={changeYear} />
        <OverlayChips activeOverlays={activeOverlays} onToggle={toggleOverlay} />
      </div>

      <MapControls onZoomIn={zoomIn} onZoomOut={zoomOut} onRecenter={recenter} />

      <div className="vc-coords">
        {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · <b>z{coords.zoom}</b>
      </div>

      <PropertyCard
        property={selectedProperty}
        visible={visible && !!selectedProperty}
      />
    </div>
  );
}
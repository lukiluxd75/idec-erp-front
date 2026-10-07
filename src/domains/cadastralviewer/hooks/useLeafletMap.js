import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { INITIAL_CENTER, INITIAL_ZOOM, MAX_ZOOM } from '../data/wmsConfig';

function createWmsLayer(record, transparent) {
  return L.tileLayer.wms(record.service_url || record.url, {
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
  });
}

export function useLeafletMap({ targetElement, active, layers = [], onFeatureInfo }) {
  const mapRef = useRef(null);
  const imageryLayerRef = useRef(null);
  const overlayLayersRef = useRef({});
  const markerRef = useRef(null);
  const searchFeatureRef = useRef(null);
  const onFeatureInfoRef = useRef(onFeatureInfo);

  const [initialized, setInitialized] = useState(false);
  const [year, setYear] = useState(null);
  const [isLoadingLayer, setIsLoadingLayer] = useState(false);
  const [coords, setCoords] = useState({
    lat: INITIAL_CENTER[0],
    lng: INITIAL_CENTER[1],
    zoom: INITIAL_ZOOM
  });
  const [activeOverlays, setActiveOverlays] = useState({});

  const imageryLayers = useMemo(() => layers.filter((layer) => layer.layer_type === 'imagery' && layer.year), [layers]);
  const vectorLayers = useMemo(() => layers.filter((layer) => layer.layer_type === 'vector'), [layers]);
  const years = useMemo(() => [...new Set(imageryLayers.map((layer) => layer.year))].sort((a, b) => b - a), [imageryLayers]);
  const selectedYear = years.includes(year) ? year : years[0] ?? null;

  useEffect(() => {
    onFeatureInfoRef.current = onFeatureInfo;
  }, [onFeatureInfo]);

  const loadImageryForYear = useCallback((map, targetYear) => {
    const entry = imageryLayers.find((i) => i.year === targetYear);
    if (!entry) {
      console.warn('[useLeafletMap] No imagery for year:', targetYear);
      return;
    }
    setIsLoadingLayer(true);

    if (imageryLayerRef.current) {
      map.removeLayer(imageryLayerRef.current);
      imageryLayerRef.current = null;
    }

    const layer = createWmsLayer(entry, false);
    let isFirstLoad = true;
    const finish = () => {
      if (isFirstLoad) {
        isFirstLoad = false;
        setIsLoadingLayer(false);
      }
    };
    layer.on('load', finish);
    setTimeout(finish, 4000); // Evita que se quede cargando si falla la red

    layer.addTo(map);
    if (layer.bringToBack) layer.bringToBack();

    Object.values(overlayLayersRef.current).forEach((ol) => {
      if (ol && map.hasLayer(ol) && ol.bringToFront) ol.bringToFront();
    });

    imageryLayerRef.current = layer;
  }, [imageryLayers]);

  // 1. Inicialización del mapa
  useEffect(() => {
    if (!active || mapRef.current || !targetElement) return undefined;

    const map = L.map(targetElement, {
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      maxZoom: MAX_ZOOM,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('moveend', () => {
      const center = map.getCenter();
      setCoords({ lat: center.lat, lng: center.lng, zoom: map.getZoom() });
    });

    map.on('click', (e) => {
      if (onFeatureInfoRef.current) {
        onFeatureInfoRef.current(e.latlng, map);
      }
    });

    mapRef.current = map;
    setInitialized(true);

    return () => {
      map.remove();
      mapRef.current = null;
      setInitialized(false);
    };
  }, [active, targetElement]);

  // 2. Carga de la capa satelital base cuando cambia el año
  useEffect(() => {
    if (mapRef.current && selectedYear) {
      loadImageryForYear(mapRef.current, selectedYear);
    }
  }, [selectedYear, loadImageryForYear]);

  // 3. Manejo de las capas vectoriales (overlays)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    vectorLayers.forEach((layerDef) => {
      const layerId = layerDef.id || layerDef.name;
      const isActive = activeOverlays[layerId];
      const existingLayer = overlayLayersRef.current[layerId];

      if (isActive && !existingLayer) {
        const newLayer = createWmsLayer(layerDef, true);
        newLayer.addTo(map);
        newLayer.bringToFront();
        overlayLayersRef.current[layerId] = newLayer;
      } else if (!isActive && existingLayer) {
        map.removeLayer(existingLayer);
        delete overlayLayersRef.current[layerId];
      }
    });
  }, [activeOverlays, vectorLayers]);

  return {
    map: mapRef.current,
    initialized,
    year: selectedYear,
    setYear,
    years,
    isLoadingLayer,
    coords,
    activeOverlays,
    setActiveOverlays,
    vectorLayers
  };
}

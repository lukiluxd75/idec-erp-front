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
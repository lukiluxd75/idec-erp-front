import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  IMAGERY_BY_YEAR,
  DEFAULT_YEAR,
  VECTOR_LAYERS,
  INITIAL_CENTER,
  INITIAL_ZOOM,
  MAX_ZOOM
} from '../data/wmsConfig';

export function useLeafletMap({ targetElement, active }) {
  const mapRef = useRef(null);
  const imageryLayerRef = useRef(null);
  const overlayLayersRef = useRef({});
  const markerRef = useRef(null);
  const [initialized, setInitialized] = useState(false);

  const [year, setYear] = useState(DEFAULT_YEAR);
  const [isLoadingLayer, setIsLoadingLayer] = useState(false);
  const [coords, setCoords] = useState({
    lat: INITIAL_CENTER[0],
    lng: INITIAL_CENTER[1],
    zoom: INITIAL_ZOOM
  });
  const [activeOverlays, setActiveOverlays] = useState({
    manzanas: false,
    vias: false,
    predios: false
  });

  const buildImageryLayer = (url) =>
    L.tileLayer.wms(url, {
      layers: '0',
      format: 'image/png',
      transparent: false,
      version: '1.1.1',
      crs: L.CRS.EPSG3857,
      maxZoom: MAX_ZOOM,
      tileSize: 256,
      uppercase: true,
      attribution: 'Catastro Cochabamba'
    });

  const buildOverlayLayer = (url) =>
    L.tileLayer.wms(url, {
      layers: '0',
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      crs: L.CRS.EPSG3857,
      maxZoom: MAX_ZOOM,
      tileSize: 256,
      uppercase: true,
      opacity: 0.9,
      attribution: 'Catastro Cochabamba'
    });

  const loadImageryForYear = useCallback((map, targetYear) => {
    const entry = IMAGERY_BY_YEAR.find((i) => i.year === targetYear);
    if (!entry) {
      console.warn('[useLeafletMap] No imagery for year:', targetYear);
      return;
    }
    setIsLoadingLayer(true);

    if (imageryLayerRef.current) {
      map.removeLayer(imageryLayerRef.current);
      imageryLayerRef.current = null;
    }

    const layer = buildImageryLayer(entry.url);
    let isFirstLoad = true;
    const finish = () => {
      if (isFirstLoad) {
        isFirstLoad = false;
        setIsLoadingLayer(false);
      }
    };
    layer.on('load', finish);
    setTimeout(finish, 4000);

    layer.addTo(map);
    if (layer.bringToBack) layer.bringToBack();

    Object.values(overlayLayersRef.current).forEach((ol) => {
      if (ol && map.hasLayer(ol) && ol.bringToFront) ol.bringToFront();
    });

    imageryLayerRef.current = layer;
  }, []);

  useEffect(() => {
    if (!active || mapRef.current || !targetElement) return;

    const map = L.map(targetElement, {
      zoomControl: false,
      attributionControl: false,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      zoomSnap: 0.5,
      maxZoom: MAX_ZOOM
    });
    mapRef.current = map;

    map.on('mousemove', (e) => {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng, zoom: map.getZoom() });
    });
    map.on('move', () => {
      const c = map.getCenter();
      setCoords({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    });

    loadImageryForYear(map, DEFAULT_YEAR);
    setInitialized(true);

    return () => {
      try { map.remove(); } catch { /* noop */ }
      mapRef.current = null;
      imageryLayerRef.current = null;
      overlayLayersRef.current = {};
      markerRef.current = null;
      setInitialized(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, targetElement]);

  useEffect(() => {
    if (initialized && active && mapRef.current) {
      const id = setTimeout(() => mapRef.current.invalidateSize(), 350);
      return () => clearTimeout(id);
    }
  }, [active, initialized]);

  const changeYear = useCallback((targetYear) => {
    setYear(targetYear);
    if (mapRef.current) loadImageryForYear(mapRef.current, targetYear);
  }, [loadImageryForYear]);

  const toggleOverlay = useCallback((key) => {
    const map = mapRef.current;
    if (!map) return;
    const cfg = VECTOR_LAYERS[key];
    if (!cfg) return;

    setActiveOverlays((prev) => {
      const next = { ...prev };
      if (next[key]) {
        const layer = overlayLayersRef.current[key];
        if (layer) {
          map.removeLayer(layer);
          delete overlayLayersRef.current[key];
        }
        next[key] = false;
      } else {
        const layer = buildOverlayLayer(cfg.url);
        layer.addTo(map);
        if (layer.bringToFront) layer.bringToFront();
        overlayLayersRef.current[key] = layer;
        next[key] = true;
      }
      return next;
    });
  }, []);

  const zoomIn  = useCallback(() => mapRef.current?.zoomIn(),  []);
  const zoomOut = useCallback(() => mapRef.current?.zoomOut(), []);
  const recenter = useCallback(() => {
    mapRef.current?.flyTo(INITIAL_CENTER, INITIAL_ZOOM, { duration: 1.1 });
  }, []);

  const flyToProperty = useCallback((property) => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    const icon = L.divIcon({
      className: 'vc-pin',
      html: '<span></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    markerRef.current = L.marker([property.lat, property.lng], { icon }).addTo(map);
    map.flyTo([property.lat, property.lng], 19, { duration: 1.2 });
  }, []);

  const clearMarker = useCallback(() => {
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  }, []);

  return {
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
  };
}
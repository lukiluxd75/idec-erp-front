// Central configuration for all WMS endpoints from Cochabamba Cadastre.
// If the base URL changes, this is the only file to touch.

export const WMS_BASE = 'https://gs.catastrocbba.com/arcgis/services';

// Satellite imagery available per year. Ordered newest → oldest.
export const IMAGERY_BY_YEAR = [
  { year: 2023, url: `${WMS_BASE}/imagenes/imagen_2023_500/MapServer/WMSServer` },
  { year: 2022, url: `${WMS_BASE}/imagenes/imagen2022/MapServer/WMSServer` },
  { year: 2021, url: `${WMS_BASE}/imagenes/imagen2021_500/MapServer/WMSServer` },
  { year: 2020, url: `${WMS_BASE}/imagenes/imagen2020_500/MapServer/WMSServer` },
  { year: 2019, url: `${WMS_BASE}/imagenes/imagen2019_500/MapServer/WMSServer` },
  { year: 2018, url: `${WMS_BASE}/imagenes/imagen2018_500/MapServer/WMSServer` },
  { year: 2017, url: `${WMS_BASE}/imagenes/imagen2017_500/MapServer/WMSServer` },
  { year: 2016, url: `${WMS_BASE}/imagenes/CBBA_2016_500/MapServer/WMSServer` },
  { year: 2015, url: `${WMS_BASE}/imagenes/imagen2015_500/MapServer/WMSServer` },
  { year: 2014, url: `${WMS_BASE}/imagenes/imagen2014_500/MapServer/WMSServer` },
  { year: 2013, url: `${WMS_BASE}/imagenes/imagen2013_500/MapServer/WMSServer` },
  { year: 2012, url: `${WMS_BASE}/imagenes/imagen2012_500/MapServer/WMSServer` },
  { year: 2011, url: `${WMS_BASE}/imagenes/imagen2011_500/MapServer/WMSServer` },
  { year: 2010, url: `${WMS_BASE}/imagenes/imagen2010_500/MapServer/WMSServer` },
  { year: 2009, url: `${WMS_BASE}/imagenes/imagen2009_500/MapServer/WMSServer` },
  { year: 2008, url: `${WMS_BASE}/imagenes/CBA_2008_500/MapServer/WMSServer` },
  { year: 2007, url: `${WMS_BASE}/imagenes/imagen2007_500/MapServer/WMSServer` },
  { year: 2004, url: `${WMS_BASE}/imagenes/imagen_2004500/MapServer/WMSServer` },
  { year: 2000, url: `${WMS_BASE}/imagenes/imagen2000_500/MapServer/WMSServer` },
  { year: 1994, url: `${WMS_BASE}/imagenes/CBA_1994_500/MapServer/WMSServer` },
  { year: 1964, url: `${WMS_BASE}/imagenes/imagen1964_500/MapServer/WMSServer` }
];

export const DEFAULT_YEAR = 2023;

// Transparent WMS overlays. Each key matches the chip identifier in the UI.
export const VECTOR_LAYERS = {
  manzanas: {
    label: 'Manzanas',
    url: `${WMS_BASE}/catastro/manzanasWms/MapServer/WMSServer`
  },
  vias: {
    label: 'Vías',
    url: `${WMS_BASE}/planificacion/vias/MapServer/WMSServer`
  },
  predios: {
    label: 'Predios',
    url: `${WMS_BASE}/catastro/prediosWms/MapServer/WMSServer`
  }
};

// Leaflet uses [lat, lng] format. Keep it that way to avoid confusion.
export const INITIAL_CENTER = [-17.38950, -66.15680];
export const INITIAL_ZOOM = 16;
export const MAX_ZOOM = 22;
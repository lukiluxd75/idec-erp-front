/**
 * Configuración de variables de entorno y metadatos de la aplicación
 */
export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8061',
  APP_NAME: 'IDEC',
  ORGANIZATION: 'GAMC',
  DEFAULT_CLIENT_ID: 'app-idec',
  IS_DEV: import.meta.env.DEV,
  // Servicio OCR externo del dominio geoextraccion — fuera del backend del ERP.
  OCR_API_URL: import.meta.env.VITE_OCR_API_URL || '',
  OCR_CONFIDENCE_THRESHOLD: parseFloat(import.meta.env.VITE_OCR_THRESHOLD || '0.99'),
}

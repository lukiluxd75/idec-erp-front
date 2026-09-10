/**
 * Catálogo de endpoints de la API (Arquitectura orientada a servicios)
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/login',
    REFRESH: '/api/refresh',
  },
  USER: {
    PRIVATE_PROFILE: '/api/private',
    CHANGE_PASSWORD: '/api/change-password',
    CHANGE_PASSWORD_INSTITUCIONAL: '/api/change-password-institucional',
  },
  SYSTEM: {
    PUBLIC_HEALTH: '/api/public',
  },
  GEOEXTRACCION: {
    GENERAR_SHAPEFILE: '/api/geoextraccion/shapefiles',
    FUSIONAR_SHAPEFILES: '/api/geoextraccion/shapefiles/fusiones',
  },
  SEGURIDAD: {
    ROLES: '/api/seguridad/roles',
    ROL_PERMISOS: (rolId) => `/api/seguridad/roles/${rolId}/permisos`,
    ROL: (rolId) => `/api/seguridad/roles/${rolId}`,
    AREAS: '/api/seguridad/areas',
    AREA: (areaId) => `/api/seguridad/areas/${areaId}`,
    USUARIOS: '/api/seguridad/usuarios',
    USUARIO_ASIGNACION: (usuarioId) => `/api/seguridad/usuarios/${usuarioId}/asignacion`,
    USUARIO_ESTADO: (usuarioId) => `/api/seguridad/usuarios/${usuarioId}/estado`,
  },
  RESOLUCIONES: {
    BASE: '/api/resoluciones',
    ONE: (id) => `/api/resoluciones/${id}`,
    PAGINA: (id, orden) => `/api/resoluciones/${id}/paginas/${orden}`,
    TABLA: (id) => `/api/resoluciones/${id}/tabla`,
  },
  DETECCION: {
    SALUD: '/api/deteccion/salud',
    WMS_CAPAS: '/api/deteccion/wms/capas',
    DETECTAR_WMS: '/api/deteccion/trabajos/detectar-wms',
    PROGRESO: (jobId) => `/api/deteccion/trabajos/${jobId}/progreso`,
    RESULTADO: (jobId) => `/api/deteccion/trabajos/${jobId}/resultado`,
    CANCELAR: (jobId) => `/api/deteccion/trabajos/${jobId}/cancelar`,
    ALINEACION: (jobId) => `/api/deteccion/trabajos/${jobId}/alineacion-manual`,
    ALINEACION_PREVIEW: (jobId) => `/api/deteccion/trabajos/${jobId}/alineacion-manual/vista-previa`,
    ALINEACION_APLICAR: (jobId) => `/api/deteccion/trabajos/${jobId}/alineacion-manual/aplicar`,
    REGISTRO_CATASTRAL: (id) => `/api/deteccion/catastro/registro-catastral/${id}`,
  },
}

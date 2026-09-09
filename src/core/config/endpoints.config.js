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
}

import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'

/** ---- Module backend (ERP templates domain: plantillas + variables) ---- */

export const templatesApi = {
  list: () => httpClient.get(API_ENDPOINTS.TEMPLATES.BASE),

  get: (id) => httpClient.get(API_ENDPOINTS.TEMPLATES.ONE(id)),

  create: (payload) => httpClient.post(API_ENDPOINTS.TEMPLATES.BASE, payload),

  update: (id, payload) => httpClient.put(API_ENDPOINTS.TEMPLATES.ONE(id), payload),

  // Soft delete on the backend (sets `activa = false`), not a real DELETE.
  deactivate: (id) => httpClient.delete(API_ENDPOINTS.TEMPLATES.ONE(id)),

  listVariables: () => httpClient.get(API_ENDPOINTS.TEMPLATES.VARIABLES),

  createVariable: (payload) => httpClient.post(API_ENDPOINTS.TEMPLATES.VARIABLES, payload),

  listCites: () => httpClient.get(API_ENDPOINTS.TEMPLATES.CITES),

  listCiteConfiguraciones: () => httpClient.get(API_ENDPOINTS.TEMPLATES.CITES_CONFIGURACIONES),

  createCiteConfiguracion: (payload) => httpClient.post(API_ENDPOINTS.TEMPLATES.CITES_CONFIGURACIONES, payload),

  // Emits the next correlative CITE for a sigla (area_codigo + tipo_documento_codigo).
  generateCite: (payload) => httpClient.post(API_ENDPOINTS.TEMPLATES.CITES_GENERAR, payload),
}

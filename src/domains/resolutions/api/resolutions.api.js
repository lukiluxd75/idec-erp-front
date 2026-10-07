import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'

/** ---- Module backend (ERP resolutions domain) ---- */

export const resolutionsApi = {
  list: () => httpClient.get(API_ENDPOINTS.RESOLUTIONS.BASE),

  create: (name, resolutionNumber, files) => {
    const fd = new FormData()
    fd.append('name', name)
    fd.append('resolution_number', resolutionNumber)
    files.forEach((file) => fd.append('pages', file))
    return httpClient.post(API_ENDPOINTS.RESOLUTIONS.BASE, fd)
  },

  get: (id) => httpClient.get(API_ENDPOINTS.RESOLUTIONS.ONE(id)),

  pageBlob: (id, orden) =>
    httpClient.get(API_ENDPOINTS.RESOLUTIONS.PAGE(id, orden), { responseType: 'blob' }),

  saveTable: (id, tableData, status) =>
    httpClient.put(API_ENDPOINTS.RESOLUTIONS.TABLE(id), { table_data: tableData, status }),

  remove: (id) => httpClient.delete(API_ENDPOINTS.RESOLUTIONS.ONE(id)),

  getPresence: () => httpClient.get(API_ENDPOINTS.RESOLUTIONS.PRESENCE),

  planPageBlob: (id, orden) =>
    httpClient.get(API_ENDPOINTS.RESOLUTIONS.PLAN_PAGE(id, orden), { responseType: 'blob' }),

  addPlanPages: (id, paginas) => {
    const fd = new FormData()
    paginas.forEach(({ blob, plantas = [] }, i) => {
      fd.append('pages', blob, `plano_${i + 1}.jpg`)
      fd.append('plantas', plantas.join('|'))
    })
    fd.append('source', 'web')
    return httpClient.post(API_ENDPOINTS.RESOLUTIONS.PLAN_PAGES(id), fd)
  },

  removePlanPage: (id, orden) => httpClient.delete(API_ENDPOINTS.RESOLUTIONS.PLAN_PAGE(id, orden)),

  setPlanPagePlantas: (id, orden, plantas) =>
    httpClient.put(API_ENDPOINTS.RESOLUTIONS.PLAN_PAGE_PLANTAS(id, orden), { plantas }),

  detectPlanPagePlanta: (id, orden) => httpClient.post(API_ENDPOINTS.RESOLUTIONS.PLAN_PAGE_DETECT(id, orden)),
}

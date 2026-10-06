import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'

function reportParams(startDate, endDate, districtId, procedureTypeIds) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    district: districtId || '0',
  })
  params.set('procedure_types', procedureTypeIds.length ? procedureTypeIds.join(',') : 'all')
  return params
}

function fetchFilters() {
  return httpClient.get(API_ENDPOINTS.REPORTS.FILTERS)
}

function fetchReport(startDate, endDate, districtId, procedureTypeIds, signal) {
  const query = reportParams(startDate, endDate, districtId, procedureTypeIds).toString()
  return httpClient.get(`${API_ENDPOINTS.REPORTS.REPORT}?${query}`, { signal })
}

async function downloadExport(kind, startDate, endDate, districtId, procedureTypeIds) {
  const path = kind === 'excel' ? API_ENDPOINTS.REPORTS.EXPORT_EXCEL : API_ENDPOINTS.REPORTS.EXPORT_PDF
  const query = reportParams(startDate, endDate, districtId, procedureTypeIds).toString()
  const blob = await httpClient.get(`${path}?${query}`, { responseType: 'blob' })
  const ext = kind === 'excel' ? 'xlsx' : 'pdf'
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reporte-gerencial-${startDate}-${endDate}.${ext}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function fmt(n, digits = 0) {
  return (n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function avg(n, d) {
  if (!d) return '—'
  return (n / d).toFixed(1)
}

function fetchPanel(startDate, endDate, districtId, procedureTypeIds, signal) {
  const query = reportParams(startDate, endDate, districtId, procedureTypeIds).toString()
  return httpClient.get(`${API_ENDPOINTS.REPORTS.PANEL}?${query}`, { signal })
}

function fetchMassForwarding(startDate, endDate, options = {}, signal) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    max_minutes: String(options.maxMinutes ?? 3),
    min_dispatches: String(options.minDispatches ?? 50),
  })
  if (options.staffName) params.set('staff_name', options.staffName)
  if (options.staffNameExact) params.set('staff_name_exact', 'true')
  return httpClient.get(`${API_ENDPOINTS.REPORTS.MASS_FORWARDING}?${params}`, { signal })
}

function fetchTrace(options = {}, signal) {
  const params = new URLSearchParams()
  if (options.procedureNumber != null) {
    params.set('procedure_number', String(options.procedureNumber))
  }
  if (options.stallThresholdDays != null) {
    params.set('stall_threshold_days', String(options.stallThresholdDays))
  }
  return httpClient.get(`${API_ENDPOINTS.REPORTS.TRACE}?${params}`, { signal })
}

export const reportsApi = {
  fetchFilters,
  fetchPanel,
  fetchMassForwarding,
  fetchTrace,
  fetchReport,
  downloadExport,
}

import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'

/** Backend calls for the appraisal_review domain (ERP). */

function listPending() {
  return httpClient.get(API_ENDPOINTS.APPRAISAL_REVIEW.PENDING)
}

function search(formNumber) {
  return httpClient.get(API_ENDPOINTS.APPRAISAL_REVIEW.SEARCH(formNumber))
}

function getDetail(formNumber) {
  return httpClient.get(API_ENDPOINTS.APPRAISAL_REVIEW.DETAIL(formNumber))
}

function sendObservations(formNumber, observations) {
  return httpClient.post(API_ENDPOINTS.APPRAISAL_REVIEW.OBSERVATIONS(formNumber), { observations })
}

function migrate(formNumber) {
  return httpClient.post(API_ENDPOINTS.APPRAISAL_REVIEW.MIGRATE(formNumber), {})
}

export const appraisalReviewApi = {
  listPending,
  search,
  getDetail,
  sendObservations,
  migrate,
}

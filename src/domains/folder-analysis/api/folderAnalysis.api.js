import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'

const E = API_ENDPOINTS.FOLDER_ANALYSIS

/**
 * "Analizador y extractor de datos de carpetas". Photos arrive from the mobile app
 * into the inbox; here they are sorted into documents (folio, tax_receipt, plan),
 * sent to the architects' PCs for analysis, reviewed and saved as JSON.
 */
export const folderAnalysisApi = {
  inbox: () => httpClient.get(E.CAPTURES),

  // Requires Bearer -> cannot be a direct <img src>; downloaded as Blob.
  captureBlob: (id, thumbnail = false) =>
    httpClient.get(thumbnail ? E.CAPTURE_THUMBNAIL(id) : E.CAPTURE_IMAGE(id), { responseType: 'blob' }),

  deleteCapture: (id) => httpClient.delete(E.CAPTURE(id)),

  documents: () => httpClient.get(E.DOCUMENTS),

  document: (id) => httpClient.get(E.DOCUMENT(id)),

  createDocument: (docType, captureIds) =>
    httpClient.post(E.DOCUMENTS, { doc_type: docType, capture_ids: captureIds }),

  setPages: (id, captureIds) => httpClient.put(E.DOCUMENT_PAGES(id), { capture_ids: captureIds }),

  deleteDocument: (id) => httpClient.delete(E.DOCUMENT(id)),

  analyze: (id, force = false) => httpClient.post(E.DOCUMENT_ANALYZE(id), { force }),

  review: (id, data) => httpClient.put(E.DOCUMENT_REVIEW(id), { data }),

  exportBlob: (id) => httpClient.get(E.DOCUMENT_EXPORT(id), { responseType: 'blob' }),
}

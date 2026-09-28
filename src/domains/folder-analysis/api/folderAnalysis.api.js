import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'

const E = API_ENDPOINTS.FOLDER_ANALYSIS

/**
 * "Analizador y extractor de datos de carpetas". Photos arrive from the mobile app
 * into the inbox; here they are sorted into documents (folio, tax_receipt, plan),
 * analyzed, reviewed and saved as JSON. A folio and a tax receipt are read on the
 * server with OCR + rules and take seconds (the screen follows them photo by
 * photo); a plan goes to the architects' PCs and takes minutes.
 */
export const folderAnalysisApi = {
  inbox: () => httpClient.get(E.CAPTURES),

  /**
   * Same entry point the mobile app uses, from the web: photos picked in the
   * computer's file explorer (or dropped on the inbox) land in the same inbox.
   * @param {File[]} files up to MAX_FILES_PER_UPLOAD images per call
   */
  uploadCaptures: (files) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    return httpClient.post(E.CAPTURES, formData)
  },

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

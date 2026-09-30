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

  /**
   * One of the three copies of a photo: 'thumbnail' for a list row, 'preview'
   * (web sized) for the viewer, 'original' only when the architect zooms past
   * what the preview can show -- the upload itself weighs several megabytes.
   * Requires Bearer -> cannot be a direct <img src>; downloaded as Blob.
   */
  captureBlob: (id, variant = 'preview') => {
    const url =
      variant === 'thumbnail'
        ? E.CAPTURE_THUMBNAIL(id)
        : variant === 'original'
          ? E.CAPTURE_IMAGE(id)
          : E.CAPTURE_PREVIEW(id)
    return httpClient.get(url, { responseType: 'blob' })
  },

  deleteCapture: (id) => httpClient.delete(E.CAPTURE(id)),

  documents: () => httpClient.get(E.DOCUMENTS),

  reviewedDocuments: (docType) =>
    httpClient.get(docType ? `${E.REVIEWED_DOCUMENTS}?doc_type=${encodeURIComponent(docType)}` : E.REVIEWED_DOCUMENTS),

  document: (id) => httpClient.get(E.DOCUMENT(id)),

  createDocument: (docType, captureIds) =>
    httpClient.post(E.DOCUMENTS, { doc_type: docType, capture_ids: captureIds }),

  setPages: (id, captureIds) => httpClient.put(E.DOCUMENT_PAGES(id), { capture_ids: captureIds }),

  deleteDocument: (id) => httpClient.delete(E.DOCUMENT(id)),

  analyze: (id, force = false) => httpClient.post(E.DOCUMENT_ANALYZE(id), { force }),

  review: (id, data) => httpClient.put(E.DOCUMENT_REVIEW(id), { data }),

  exportBlob: (id) => httpClient.get(E.DOCUMENT_EXPORT(id), { responseType: 'blob' }),

  /**
   * "Carpetas registradas": the saved documents grouped by project, each carpeta
   * under the name the architect gave it. Every call answers with the carpeta (or
   * the whole list) already carrying its documents and their saved data, so the
   * screen never has to ask for them one by one.
   */
  folders: () => httpClient.get(E.FOLDERS),

  createFolder: ({ name, notes, documentIds }) =>
    httpClient.post(E.FOLDERS, { name, notes: notes || null, document_ids: documentIds || [] }),

  /** `documentIds` omitted renames only; sent, it becomes the whole content. */
  updateFolder: (id, { name, notes, documentIds }) =>
    httpClient.put(E.FOLDER(id), {
      name,
      notes: notes || null,
      ...(documentIds === undefined ? {} : { document_ids: documentIds }),
    }),

  deleteFolder: (id) => httpClient.delete(E.FOLDER(id)),

  addFolderDocuments: (id, documentIds) =>
    httpClient.post(E.FOLDER_DOCUMENTS(id), { document_ids: documentIds }),

  /** Takes the document out of the carpeta; the document itself stays saved. */
  removeFolderDocument: (id, documentId) => httpClient.delete(E.FOLDER_DOCUMENT(id, documentId)),
}

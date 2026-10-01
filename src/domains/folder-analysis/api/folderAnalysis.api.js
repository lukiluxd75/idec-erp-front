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
  /**
   * Which kinds of carpeta exist, which documents each one holds and which
   * fields its own sheet asks for. The screen draws itself from this instead of
   * knowing any carpeta by name -- see utils/catalog.js, which reads it once.
   */
  catalog: () => httpClient.get(E.CATALOG),

  /**
   * Poseedores: the predio of a code catastral placed on the IDE (outline,
   * neighbours by the eight points of the compass, streets, surface). With the
   * plano's `documentId`, what the plano declares comes back next to what the
   * GIS measures.
   */
  /** The croquis de ubicacion of a predio as a PNG (Blob): needs Bearer, so it is not an <img src>. */
  cadastralCroquisBlob: (code) =>
    httpClient.get(`${E.CADASTRAL_CROQUIS}?code=${encodeURIComponent(code)}`, { responseType: 'blob' }),

  cadastralParcel: (code, documentId) => {
    const query = new URLSearchParams({ code })
    if (documentId) query.set('document_id', documentId)
    return httpClient.get(`${E.CADASTRAL_PARCEL}?${query}`)
  },

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

  /**
   * Vacía la bandeja de una vez. Solo se van las fotos todavía sin clasificar;
   * las que ya son página de un documento se quedan donde están. Responde
   * cuántas se borraron.
   */
  clearInbox: () => httpClient.delete(E.CAPTURES),

  /** All of the user's documents, or only the ones worked on inside a carpeta. */
  documents: (folderId) =>
    httpClient.get(folderId ? `${E.DOCUMENTS}?folder_id=${encodeURIComponent(folderId)}` : E.DOCUMENTS),

  reviewedDocuments: (docType, folderId) => {
    const query = new URLSearchParams()
    if (docType) query.set('doc_type', docType)
    if (folderId) query.set('folder_id', folderId)
    const suffix = query.toString()
    return httpClient.get(suffix ? `${E.REVIEWED_DOCUMENTS}?${suffix}` : E.REVIEWED_DOCUMENTS)
  },

  document: (id) => httpClient.get(E.DOCUMENT(id)),

  /**
   * `folderId` opens the document inside that carpeta, which is where it stays
   * from then on. Without it, the document is classified on the loose board and
   * belongs to no carpeta. The server refuses a type the carpeta does not hold.
   */
  createDocument: (docType, captureIds, folderId, folderType) =>
    httpClient.post(E.DOCUMENTS, {
      doc_type: docType,
      capture_ids: captureIds,
      ...(folderId ? { folder_id: folderId } : {}),
      ...(folderType ? { folder_type: folderType } : {}),
    }),

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

  /** Una carpeta con su tipo, su hoja y los documentos que tiene dentro. */
  folder: (id) => httpClient.get(E.FOLDER(id)),

  /**
   * `folderType` is the kind of trámite, chosen when the carpeta is opened and
   * fixed from then on: it is what says which lanes its board shows and which
   * fields its sheet (`data`) asks for.
   */
  createFolder: ({ name, notes, folderType, data, documentIds }) =>
    httpClient.post(E.FOLDERS, {
      name,
      notes: notes || null,
      folder_type: folderType || null,
      data: data || {},
      document_ids: documentIds || [],
    }),

  /**
   * Name, note and sheet. `documentIds` omitted leaves the contents alone; sent,
   * it replaces the reviewed documents (the ones still being worked on inside
   * the carpeta stay in it). The kind is not editable.
   */
  updateFolder: (id, { name, notes, data, documentIds }) =>
    httpClient.put(E.FOLDER(id), {
      name,
      notes: notes || null,
      data: data || {},
      ...(documentIds === undefined ? {} : { document_ids: documentIds }),
    }),

  deleteFolder: (id) => httpClient.delete(E.FOLDER(id)),

  addFolderDocuments: (id, documentIds) =>
    httpClient.post(E.FOLDER_DOCUMENTS(id), { document_ids: documentIds }),

  /** Takes the document out of the carpeta; the document itself stays saved. */
  removeFolderDocument: (id, documentId) => httpClient.delete(E.FOLDER_DOCUMENT(id, documentId)),
}

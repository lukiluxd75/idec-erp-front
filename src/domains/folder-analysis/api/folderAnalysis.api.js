import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'

const E = API_ENDPOINTS.FOLDER_ANALYSIS

/** "Analizador y extractor de datos de carpetas". */
export const folderAnalysisApi = {
  /** Which kinds of carpeta exist, which documents each one holds and which fields its own sheet asks for. */
  catalog: () => httpClient.get(E.CATALOG),

  /** The croquis de ubicacion of a predio as a PNG (Blob): needs Bearer, so it is not an <img src>. */
  cadastralCroquisBlob: (code) =>
    httpClient.get(`${E.CADASTRAL_CROQUIS}?code=${encodeURIComponent(code)}`, { responseType: 'blob' }),

  cadastralParcel: (code, documentId) => {
    const query = new URLSearchParams({ code })
    if (documentId) query.set('document_id', documentId)
    return httpClient.get(`${E.CADASTRAL_PARCEL}?${query}`)
  },

  inbox: () => httpClient.get(E.CAPTURES),

  /** Snapshot de "hay un celular conectado" para PhoneConnectedBadge, consultado por usePhonePresence. */
  presence: () => httpClient.get(E.CAPTURES_PRESENCE),

  /**
   * Same entry point the mobile app uses, from the web: photos picked in the
   * computer's file explorer (or dropped on the inbox) land in the same inbox.
   * @param {File[]} files las de una tanda; no hay tope de cuántas, solo de
   *   cuánto pesan juntas (MAX_UPLOAD_BYTES, ver chunkForUpload)
   */
  uploadCaptures: (files) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    return httpClient.post(E.CAPTURES, formData)
  },

  captureBlob: (id, variant = 'preview', folderId = null) => {
    if (folderId) {
      const query = new URLSearchParams({ variant }).toString()
      return httpClient.get(`${E.FOLDER_PHOTO(folderId, id)}?${query}`, { responseType: 'blob' })
    }
    const url =
      variant === 'thumbnail'
        ? E.CAPTURE_THUMBNAIL(id)
        : variant === 'original'
          ? E.CAPTURE_IMAGE(id)
          : E.CAPTURE_PREVIEW(id)
    return httpClient.get(url, { responseType: 'blob' })
  },

  deleteCapture: (id) => httpClient.delete(E.CAPTURE(id)),

  /** Vacía la bandeja de una vez. */
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

  /** `folderId` opens the document inside that carpeta, which is where it stays from then on. */
  createDocument: (docType, captureIds, folderId, folderType) =>
    httpClient.post(E.DOCUMENTS, {
      doc_type: docType,
      capture_ids: captureIds,
      ...(folderId ? { folder_id: folderId } : {}),
      ...(folderType ? { folder_type: folderType } : {}),
    }),

  setPages: (id, captureIds) => httpClient.put(E.DOCUMENT_PAGES(id), { capture_ids: captureIds }),

  /** Deja en un solo documento el carril que la carpeta guarda sin leer: sus tarjetas y lo que siga en la bandeja. */
  consolidate: (docType, folderId, folderType) =>
    httpClient.post(E.CONSOLIDATE_DOCUMENTS, {
      doc_type: docType,
      ...(folderId ? { folder_id: folderId } : {}),
      ...(folderType ? { folder_type: folderType } : {}),
    }),

  deleteDocument: (id) => httpClient.delete(E.DOCUMENT(id)),

  analyze: (id, force = false) => httpClient.post(E.DOCUMENT_ANALYZE(id), { force }),

  review: (id, data) => httpClient.put(E.DOCUMENT_REVIEW(id), { data }),

  exportBlob: (id) => httpClient.get(E.DOCUMENT_EXPORT(id), { responseType: 'blob' }),

  /** "Carpetas registradas": the saved documents grouped by project, each carpeta under the name the architect gave it. */
  folders: () => httpClient.get(E.FOLDERS),

  /** Busca carpetas por su nombre (el número de la carpeta física). */
  searchFolders: (name) =>
    httpClient.get(`${E.FOLDERS}?${new URLSearchParams({ name }).toString()}`),

  saveBoardToFolder: ({ folderNumber, folderType, documentIds }) =>
    httpClient.post(E.FOLDERS_FROM_BOARD, {
      folder_number: folderNumber,
      folder_type: folderType || null,
      document_ids: documentIds,
    }),

  /** Una carpeta con su tipo, su hoja y los documentos que tiene dentro. */
  folder: (id) => httpClient.get(E.FOLDER(id)),

  createFolder: ({ name, notes, folderType, data, documentIds }) =>
    httpClient.post(E.FOLDERS, {
      name,
      notes: notes || null,
      folder_type: folderType || null,
      data: data || {},
      document_ids: documentIds || [],
    }),

  /** Name, note and sheet. */
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

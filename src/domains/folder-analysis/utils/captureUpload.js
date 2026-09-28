// Limits mirrored from the backend (UploadCapturesUseCase): rejecting here lets the
// architect fix the selection instead of losing the whole batch on a 400.
export const MAX_FILES_PER_UPLOAD = 10
export const MAX_FILE_BYTES = 15 * 1024 * 1024

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

/** `accept` for the file explorer dialog and for drag & drop from the desktop. */
export const CAPTURE_ACCEPT = [...ACCEPTED_EXTENSIONS, ...ACCEPTED_TYPES].join(',')

function isImage(file) {
  if (file.type) return ACCEPTED_TYPES.includes(file.type)
  // Some Windows file pickers hand over an empty type; fall back to the extension.
  return ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
}

/**
 * Splits the picked files into the ones that can be sent and a human-readable
 * reason for each one that cannot.
 * @param {FileList|File[]} picked
 * @returns {{ files: File[], rejected: string[] }}
 */
export function splitValidCaptures(picked) {
  const files = []
  const rejected = []

  Array.from(picked || []).forEach((file) => {
    if (!isImage(file)) {
      rejected.push(`${file.name}: solo se aceptan imágenes JPG, PNG o WEBP.`)
    } else if (file.size === 0) {
      rejected.push(`${file.name}: el archivo está vacío.`)
    } else if (file.size > MAX_FILE_BYTES) {
      rejected.push(`${file.name}: supera los 15 MB.`)
    } else {
      files.push(file)
    }
  })

  return { files, rejected }
}

/** The backend accepts MAX_FILES_PER_UPLOAD photos per request; bigger selections go in several. */
export function chunkForUpload(files) {
  const chunks = []
  for (let i = 0; i < files.length; i += MAX_FILES_PER_UPLOAD) {
    chunks.push(files.slice(i, i + MAX_FILES_PER_UPLOAD))
  }
  return chunks
}

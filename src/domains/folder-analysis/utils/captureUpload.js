export const MAX_FILE_BYTES = 15 * 1024 * 1024
export const MAX_UPLOAD_BYTES = 300 * 1024 * 1024

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf']

/** `accept` for the file explorer dialog and for drag & drop from the desktop. */
export const CAPTURE_ACCEPT = [...ACCEPTED_EXTENSIONS, ...ACCEPTED_TYPES].join(',')

function isAccepted(file) {
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
    if (!isAccepted(file)) {
      rejected.push(`${file.name}: solo se aceptan imágenes JPG, PNG, WEBP o archivos PDF.`)
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

/** La selección partida en las tandas en que se va a mandar. */
export function chunkForUpload(files) {
  const chunks = []
  let current = []
  let weight = 0

  for (const file of files) {
    if (current.length > 0 && weight + file.size > MAX_UPLOAD_BYTES) {
      chunks.push(current)
      current = []
      weight = 0
    }
    current.push(file)
    weight += file.size
  }
  if (current.length > 0) chunks.push(current)

  return chunks
}

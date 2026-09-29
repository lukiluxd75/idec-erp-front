/**
 * Convierte un PDF (plano escaneado subido desde la web) en una imagen JPEG
 * por pagina -- asi el backend y la deteccion CV de colindancias nunca
 * tienen que distinguir "vino de PDF" vs "foto sacada con el celular": las
 * dos terminan siendo el mismo tipo de archivo (una imagen), lo mismo que ya
 * pasa con las fotos de la tabla de superficies.
 */

// Dynamic import: pdfjs-dist (con su worker) solo se necesita si alguien
// realmente sube un PDF desde la web -- igual que @techstark/opencv-js en
// tableLineDetector.js, no tiene sentido que vaya en el bundle principal.
let pdfjsPromise = null
function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjsLib, worker]) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjsLib
    })
  }
  return pdfjsPromise
}

// Escala 2 sobre el punto base de 72dpi del PDF (~144dpi): alcanza para leer
// nombres de ambiente y cotas del plano sin generar imagenes gigantes.
const ESCALA = 2

/** @param {File|Blob} file @returns {Promise<Blob[]>} una imagen JPEG por pagina */
export async function pdfToImages(file) {
  const pdfjsLib = await getPdfjs()
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const imagenes = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: ESCALA })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    imagenes.push(blob)
  }
  return imagenes
}

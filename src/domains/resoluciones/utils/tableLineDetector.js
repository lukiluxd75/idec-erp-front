/**
 * Corrige la rotacion de la foto de una tabla "RELACION DE SUPERFICIE" (una
 * tabla por foto, como escanea la app real) usando el angulo promedio de sus
 * propias lineas horizontales, y devuelve las posiciones Y de las lineas de
 * fila ya sobre la imagen corregida -- para que el parser
 * (superficiesOcrParser.js) las use como limite de fila real en vez de
 * agrupar los bloques OCR solo por un gap fijo en Y.
 *
 * Se corrige SOLO rotacion (no perspectiva de 4 esquinas): probado contra
 * fotos reales, buscar las 4 esquinas de la tabla es fragil -- si un borde
 * sale debil/fragmentado en la foto (glare, sombra), el borde detectado
 * termina siendo una linea interior en vez del borde real, y el recorte por
 * perspectiva PIERDE columnas enteras de datos. Rotar sin recortar (canvas
 * de salida agrandado) no tiene ese riesgo: en el peor caso no mejora nada,
 * nunca pierde datos.
 *
 * Nunca lanza: si no hay lineas horizontales candidatas suficientes (foto sin
 * lineas visibles, muy recortada, etc.) se devuelve la imagen original sin
 * tocar y `lineYs: []`, y el parser cae a su heuristico de siempre.
 */

// Import dinamico: @techstark/opencv-js pesa varios MB (wasm embebido) y solo
// hace falta en esta pantalla al apretar "Extraer con OCR" -- si fuera un
// import estatico, Vite lo mete en el bundle principal y lo bajan todas las
// paginas de la app, lo usen o no.
let cvPromise = null
function getCv() {
  if (!cvPromise) {
    cvPromise = import('@techstark/opencv-js').then(async ({ default: cvModule }) => {
      // La version instalada (5.0.0-release.1) exporta el default como una
      // Promesa que resuelve directo al objeto cv (verificado en Node: el
      // patron viejo de "cv.onRuntimeInitialized = cb" nunca dispara aca,
      // se cuelga para siempre). Se soportan los dos formatos por las dudas.
      if (typeof cvModule.then === 'function') return cvModule
      if (cvModule.Mat) return cvModule
      return new Promise((resolve) => {
        cvModule['onRuntimeInitialized'] = () => resolve(cvModule)
      })
    })
  }
  return cvPromise
}

async function matFromBlob(cv, blob) {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d').drawImage(bitmap, 0, 0)
  const mat = cv.imread(canvas)
  bitmap.close()
  return mat
}

function matToJpegBlob(cv, mat, quality = 0.9) {
  const canvas = document.createElement('canvas')
  canvas.width = mat.cols
  canvas.height = mat.rows
  cv.imshow(canvas, mat)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

// Otsu: separa tinta oscura (texto/lineas) del papel, sin depender de un
// umbral fijo -- las fotos de celular varian mucho en iluminacion.
function binarize(cv, colorMat) {
  const gray = new cv.Mat()
  cv.cvtColor(colorMat, gray, cv.COLOR_RGBA2GRAY)
  const bin = new cv.Mat()
  cv.threshold(gray, bin, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU)
  gray.delete()
  return bin
}

// Aisla trazos horizontales largos (MORPH_OPEN con kernel angosto-y-largo):
// solo sobreviven las lineas de grilla, el texto es demasiado corto. Se
// pre-dilata 1-2px en el eje corto (vertical) antes de la erosion larga: sin
// eso, una linea apenas inclinada se corta en fragmentos cortos en cuanto se
// desvia de fila -- probado contra una foto real, sin este paso se pierden
// casi todas las lineas de fila.
function extractHorizontalLineMask(cv, bin) {
  const size = Math.max(15, Math.round(bin.cols / 20))
  const preKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, 3))
  const dilated = new cv.Mat()
  cv.dilate(bin, dilated, preKernel)
  preKernel.delete()

  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(size, 1))
  const out = new cv.Mat()
  cv.morphologyEx(dilated, out, cv.MORPH_OPEN, kernel)
  dilated.delete()
  kernel.delete()
  return out
}

function findContourRects(cv, mask) {
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()
  cv.findContours(mask, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)
  hierarchy.delete()
  const rects = []
  for (let i = 0; i < contours.size(); i++) {
    const c = contours.get(i)
    rects.push({ idx: i, rect: cv.boundingRect(c) })
    c.delete()
  }
  return { contours, rects }
}

// Angulo (grados, mediana -- tolera outliers) de las lineas horizontales
// largas detectadas: ese es el angulo de inclinacion de la foto a corregir.
function estimateSkewAngleDeg(cv, colorMat) {
  const bin = binarize(cv, colorMat)
  const mask = extractHorizontalLineMask(cv, bin)
  const { contours, rects } = findContourRects(cv, mask)
  const minW = colorMat.cols * 0.4
  const cand = rects.filter((r) => r.rect.width >= minW)

  const angles = cand.map(({ idx }) => {
    const c = contours.get(idx)
    const line = new cv.Mat()
    cv.fitLine(c, line, cv.DIST_L2, 0, 0.01, 0.01)
    const angle = (Math.atan2(line.data32F[1], line.data32F[0]) * 180) / Math.PI
    line.delete()
    c.delete()
    return angle
  })

  bin.delete()
  mask.delete()
  contours.delete()

  if (angles.length < 2) return { angle: 0, n: angles.length }
  angles.sort((a, b) => a - b)
  const mid = Math.floor(angles.length / 2)
  const angle = angles.length % 2 ? angles[mid] : (angles[mid - 1] + angles[mid]) / 2
  return { angle, n: angles.length }
}

// Rota sin recortar: el lienzo de salida se agranda para contener toda la
// imagen rotada (a diferencia de un recorte por perspectiva, nunca puede
// perder una columna/fila de datos por errar el calculo de un borde).
function rotateNoCrop(cv, colorMat, angleDeg) {
  const { cols: w, rows: h } = colorMat
  const M = cv.getRotationMatrix2D(new cv.Point(w / 2, h / 2), angleDeg, 1)
  const rad = (Math.abs(angleDeg) * Math.PI) / 180
  const newW = Math.round(w * Math.cos(rad) + h * Math.sin(rad))
  const newH = Math.round(w * Math.sin(rad) + h * Math.cos(rad))
  M.doublePtr(0, 2)[0] += (newW - w) / 2
  M.doublePtr(1, 2)[0] += (newH - h) / 2
  const out = new cv.Mat()
  cv.warpAffine(
    colorMat,
    out,
    M,
    new cv.Size(newW, newH),
    cv.INTER_LINEAR,
    cv.BORDER_CONSTANT,
    new cv.Scalar(255, 255, 255, 255),
  )
  M.delete()
  return out
}

// Sobre la imagen ya rotada, el centro de cada trazo horizontal largo es la
// posicion Y de esa linea de fila.
function detectRowLines(cv, colorMat) {
  const bin = binarize(cv, colorMat)
  const mask = extractHorizontalLineMask(cv, bin)
  const { contours, rects } = findContourRects(cv, mask)
  const minW = colorMat.cols * 0.5
  const ys = rects
    .filter((r) => r.rect.width >= minW)
    .map((r) => r.rect.y + r.rect.height / 2)
    .sort((a, b) => a - b)

  // funde lineas a menos de 4px (mismo trazo partido en 2 contornos)
  const merged = []
  ys.forEach((y) => {
    if (merged.length && y - merged[merged.length - 1] < 4) return
    merged.push(y)
  })

  bin.delete()
  mask.delete()
  contours.delete()
  return merged
}

/**
 * @param {Blob} blob foto de una pagina (una tabla)
 * @returns {Promise<{ blob: Blob, lineYs: number[], corregido: boolean }>}
 */
export async function detectarYEnderezarTabla(blob) {
  let cv
  try {
    cv = await getCv()
  } catch {
    return { blob, lineYs: [], corregido: false }
  }

  let original
  let rotated
  try {
    original = await matFromBlob(cv, blob)
    const { angle, n } = estimateSkewAngleDeg(cv, original)
    if (n < 2) return { blob, lineYs: [], corregido: false }

    rotated = rotateNoCrop(cv, original, angle)
    const lineYs = detectRowLines(cv, rotated)
    const rotatedBlob = await matToJpegBlob(cv, rotated)
    return { blob: rotatedBlob, lineYs, corregido: true }
  } catch (e) {
     
    console.log('[tableLineDetector] fallo el deskew, se usa la foto original', e)
    return { blob, lineYs: [], corregido: false }
  } finally {
    original?.delete()
    rotated?.delete()
  }
}

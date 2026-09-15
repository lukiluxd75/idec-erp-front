/**
 * Corrects rotation of a "RELACION DE SUPERFICIE" table photo (one table per
 * photo, as the real app scans) using the average angle of its own horizontal
 * lines, and returns the Y positions of row lines on the corrected image -- so
 * the parser (surfacesOcrParser.js) can use them as real row boundaries instead
 * of grouping OCR blocks only by a fixed Y gap.
 *
 * Corrects ONLY rotation (not 4-corner perspective): tested on real photos,
 * finding the table's 4 corners is fragile -- if an edge is weak/fragmented
 * (glare, shadow), the detected edge becomes an interior line and perspective
 * crop LOSES entire data columns. Rotate without cropping (enlarged output
 * canvas) has no that risk: worst case it improves nothing, never loses data.
 *
 * Never throws: if there are not enough candidate horizontal lines (photo with
 * no visible lines, heavily cropped, etc.) returns the original image untouched
 * and `lineYs: []`, and the parser falls back to its usual heuristic.
 */

// Dynamic import: @techstark/opencv-js weighs several MB (embedded wasm) and is
// only needed on this screen when pressing "Extraer con OCR" -- a static import
// would put it in the main bundle and every page would download it unused.
let cvPromise = null
function getCv() {
  if (!cvPromise) {
    cvPromise = import('@techstark/opencv-js').then(async ({ default: cvModule }) => {
      // Installed version (5.0.0-release.1) exports default as a Promise that
      // resolves straight to the cv object (verified in Node: the old
      // "cv.onRuntimeInitialized = cb" pattern never fires here and hangs
      // forever). Both formats are supported just in case.
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

// Otsu: separates dark ink (text/lines) from paper without a fixed threshold
// -- phone photos vary a lot in lighting.
function binarize(cv, colorMat) {
  const gray = new cv.Mat()
  cv.cvtColor(colorMat, gray, cv.COLOR_RGBA2GRAY)
  const bin = new cv.Mat()
  cv.threshold(gray, bin, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU)
  gray.delete()
  return bin
}

// Isolate long horizontal strokes (MORPH_OPEN with a narrow-and-long kernel):
// only grid lines survive; text is too short. Pre-dilate 1-2px on the short
// (vertical) axis before the long erosion: without that, a slightly tilted
// line breaks into short fragments as soon as it leaves the row -- tested on
// a real photo; without this step almost all row lines are lost.
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

// Angle (degrees, median -- tolerates outliers) of detected long horizontal
// lines: that is the photo tilt angle to correct.
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

// Rotate without cropping: output canvas grows to hold the full rotated image
// (unlike a perspective crop, it can never lose a data column/row by
// miscalculating an edge).
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

// On the already-rotated image, the center of each long horizontal stroke is the
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
 * @param {Blob} blob photo of one page (one table)
 * @returns {Promise<{ blob: Blob, lineYs: number[], corregido: boolean }>}
 */
export async function detectAndDeskewTable(blob) {
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

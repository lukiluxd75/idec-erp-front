/**
 * Detecta hacia dónde apunta el norte en una página del plano de división,
 * a partir de la rosa de los vientos que el dibujante siempre incluye (un
 * círculo/flecha con la letra "N") -- así el cálculo de colindancias
 * (colindanciasDetector.js) puede razonar en "arriba = norte" sin importar
 * cómo haya quedado rotada la foto/el PDF.
 *
 * Como cualquier detección "asistida" (ver ColindanciasSection.jsx), esto es
 * una SUGERENCIA: nunca lanza, y si no encuentra nada confiable devuelve
 * angleDeg=0 con confidence='baja' -- el usuario corrige con los botones de
 * rotación manual. No se intenta reconocer el dibujo exacto de la flecha
 * (varía mucho según el dibujante); alcanza con encontrar la letra "N" del
 * OCR y, alrededor suyo, el trazo recto más largo (el asta de la flecha o el
 * borde del círculo) para estimar la orientación.
 *
 * Convención de angleDeg: es el ángulo (en grados, sentido horario) al que
 * apunta el norte detectado, tomando "arriba" (eje -Y de la imagen) como 0°.
 * Para llevar un punto de la imagen al sistema "arriba = norte" hay que
 * rotarlo por -angleDeg (ver rotatePoint más abajo, reusado por
 * colindanciasDetector.js).
 */

let cvPromise = null
function getCv() {
  if (!cvPromise) {
    cvPromise = import('@techstark/opencv-js').then(async ({ default: cvModule }) => {
      // Mismo comportamiento verificado en tableLineDetector.js: la version
      // instalada resuelve el default export directo al objeto cv.
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

function blockCenter(b) {
  const xs = b.points.map((p) => p[0])
  const ys = b.points.map((p) => p[1])
  return { x: xs.reduce((a, v) => a + v, 0) / 4, y: ys.reduce((a, v) => a + v, 0) / 4 }
}

function blockDiag(b) {
  const xs = b.points.map((p) => p[0])
  const ys = b.points.map((p) => p[1])
  const w = Math.max(...xs) - Math.min(...xs)
  const h = Math.max(...ys) - Math.min(...ys)
  return Math.hypot(w, h)
}

/** Rota (x,y) alrededor de (cx,cy) por angleDeg (sentido horario, coords de imagen Y-hacia-abajo). */
export function rotatePoint(x, y, cx, cy, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180
  const dx = x - cx
  const dy = y - cy
  return {
    x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  }
}

// Candidatos a la "N" de la rosa de los vientos: texto corto, prácticamente
// solo la letra N (tolera el punto que a veces agrega el OCR: "N.").
function esCandidatoN(texto) {
  return /^n\.?$/i.test((texto || '').trim())
}

// Radio (px) de la zona alrededor de la "N" donde se busca el trazo de la
// flecha/círculo -- proporcional al tamaño de imagen, ni tan chico que se
// pierda la flecha ni tan grande que agarre otro dibujo del plano.
function radioBusqueda(cols, rows) {
  return Math.max(60, Math.round(Math.min(cols, rows) * 0.12))
}

// Dado un candidato "N", busca a su alrededor el segmento recto mas largo
// (asta de la flecha o borde del circulo) y devuelve el angulo del vector que
// va desde el CENTRO de ese trazo hacia la propia "N" -- la letra siempre se
// dibuja en la punta de la flecha o pegada al circulo, nunca en el extremo
// opuesto, así que ese vector apunta hacia el norte real.
function estimarAnguloLocal(cv, colorMat, cx, cy) {
  const r = radioBusqueda(colorMat.cols, colorMat.rows)
  const x0 = Math.max(0, Math.round(cx - r))
  const y0 = Math.max(0, Math.round(cy - r))
  const w = Math.min(colorMat.cols - x0, r * 2)
  const h = Math.min(colorMat.rows - y0, r * 2)
  if (w < 10 || h < 10) return null

  const roi = colorMat.roi(new cv.Rect(x0, y0, w, h))
  const gray = new cv.Mat()
  const edges = new cv.Mat()
  const lines = new cv.Mat()
  try {
    cv.cvtColor(roi, gray, cv.COLOR_RGBA2GRAY)
    cv.Canny(gray, edges, 50, 150)
    // minLineLength generoso: interesa el asta larga de la flecha o el arco
    // del circulo, no las rayitas sueltas de textura/ruido del escaneo.
    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 20, r * 0.5, r * 0.25)
    if (lines.rows === 0) return null

    // El trazo mas largo dentro del recorte.
    let mejor = null
    let mejorLargo = -1
    for (let i = 0; i < lines.rows; i++) {
      const [lx1, ly1, lx2, ly2] = lines.data32S.slice(i * 4, i * 4 + 4)
      const largo = Math.hypot(lx2 - lx1, ly2 - ly1)
      if (largo > mejorLargo) {
        mejorLargo = largo
        mejor = { lx1, ly1, lx2, ly2 }
      }
    }
    if (!mejor) return null

    // Punto medio del trazo, en coordenadas de la imagen completa.
    const midX = x0 + (mejor.lx1 + mejor.lx2) / 2
    const midY = y0 + (mejor.ly1 + mejor.ly2) / 2

    // Vector desde el punto medio del trazo hacia la propia "N".
    const vx = cx - midX
    const vy = cy - midY
    if (vx === 0 && vy === 0) return null
    // 0deg = "arriba" (-Y), sentido horario -- misma convencion documentada arriba.
    return (Math.atan2(vx, -vy) * 180) / Math.PI
  } finally {
    roi.delete()
    gray.delete()
    edges.delete()
    lines.delete()
  }
}

/**
 * @param {Blob} blob                 imagen de la pagina del plano
 * @param {Array<{points:number[][],text:string}>} bloquesOcr  salida de ocrImage() sobre esa misma imagen
 * @returns {Promise<{angleDeg:number, confidence:'alta'|'baja', origen:string}>}
 */
export async function detectNorth(blob, bloquesOcr) {
  const candidatos = (bloquesOcr || []).filter((b) => esCandidatoN(b.text))
  if (candidatos.length === 0) {
    return { angleDeg: 0, confidence: 'baja', origen: 'no se encontró la letra "N" del rótulo de norte' }
  }

  // Si el OCR encontro varias "N" sueltas (comun: alguna letra de otro texto
  // se lee sola), se proban todas y se toma la primera con deteccion valida
  // de trazo -- son pocas candidatas, no vale la pena adivinar cual es la
  // correcta antes de intentar.
  let cv
  try {
    cv = await getCv()
  } catch {
    return { angleDeg: 0, confidence: 'baja', origen: 'no se pudo cargar OpenCV' }
  }

  let mat
  try {
    mat = await matFromBlob(cv, blob)
    // Candidatas mas chicas primero: la "N" del rotulo de norte es letra
    // suelta, mucho mas chica que texto normal de ambientes/cotas.
    const ordenadas = [...candidatos].sort((a, b) => blockDiag(a) - blockDiag(b))
    for (const cand of ordenadas) {
      const { x, y } = blockCenter(cand)
      const angulo = estimarAnguloLocal(cv, mat, x, y)
      if (angulo != null) {
        return { angleDeg: angulo, confidence: 'alta', origen: `"N" en (${Math.round(x)}, ${Math.round(y)})` }
      }
    }
    return { angleDeg: 0, confidence: 'baja', origen: 'se encontró la "N" pero no un trazo claro alrededor' }
  } catch (e) {

    console.log('[planNorthDetector] fallo la deteccion, se usa 0°', e)
    return { angleDeg: 0, confidence: 'baja', origen: 'error de detección' }
  } finally {
    mat?.delete()
  }
}

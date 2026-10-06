
import { buscarSimboloNorteFlecha } from './planNorthArrow'

let cvPromise = null
function getCv() {
  if (!cvPromise) {
    // Vía opencvLoader.js: importar '@techstark/opencv-js' directo con import() falla en el navegador (ver ese archivo).
    cvPromise = import('./opencvLoader').then(async ({ obtenerCv }) => {
      const cvModule = obtenerCv()
      if (!cvModule) throw new Error('OpenCV no quedó disponible')
      if (cvModule.Mat) return cvModule
      if (typeof cvModule.then === 'function') return await cvModule
      return new Promise((resolve) => {
        cvModule['onRuntimeInitialized'] = () => resolve(cvModule)
      })
    })
    // Si falla, que el próximo intento vuelva a probar en vez de quedar roto.
    cvPromise.catch(() => {
      cvPromise = null
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

const LADO_TRABAJO = 1600
const UMBRALES_GROSOR = [4, 3, 2.5, 2]
const PUNTAJE_MINIMO = 1.6
const PUNTAJE_ALTA = 2.4

const r1 = (v) => Math.round(v * 10) / 10

/** Ángulo (0 = arriba, sentido horario) del vector (dx,dy) en coords de imagen. */
function anguloDe(dx, dy) {
  return (((Math.atan2(dx, -dy) * 180) / Math.PI) % 360 + 360) % 360
}

function difAngular(a, b) {
  return ((((a - b + 180) % 360) + 360) % 360) - 180
}

function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Círculo por mínimos cuadrados (Kasa) sobre los índices `idx` de xs/ys. */
function ajustarCirculo(xs, ys, idx) {
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0
  const n = idx.length
  for (const i of idx) {
    const x = xs[i]
    const y = ys[i]
    const z = x * x + y * y
    sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z
  }
  // Sistema normal de [x y 1]·[a b c] = x²+y²
  const m = [
    [sxx, sxy, sx, sxz],
    [sxy, syy, sy, syz],
    [sx, sy, n, sz],
  ]
  for (let c = 0; c < 3; c++) {
    let piv = c
    for (let r = c + 1; r < 3; r++) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r
    if (Math.abs(m[piv][c]) < 1e-9) return null
    ;[m[c], m[piv]] = [m[piv], m[c]]
    for (let r = 0; r < 3; r++) {
      if (r === c) continue
      const f = m[r][c] / m[c][c]
      for (let k = c; k < 4; k++) m[r][k] -= f * m[c][k]
    }
  }
  const a = m[0][3] / m[0][0]
  const b = m[1][3] / m[1][1]
  const c = m[2][3] / m[2][2]
  const cx = a / 2
  const cy = b / 2
  const r2 = c + cx * cx + cy * cy
  return r2 > 0 ? { cx, cy, r: Math.sqrt(r2) } : null
}

function medirSimbolo(grueso, etiquetas, etiqueta, ancho, alto, cx, cy, R) {
  const paso = 3
  const cubre = []
  const dentro = []
  for (let d = 0; d < 360; d += paso) {
    const a = (d * Math.PI) / 180
    let hit = false
    let adentro = true
    for (let k = 0; k < 7; k++) {
      const r = R * (0.85 + (0.3 * k) / 6)
      const x = Math.round(cx + r * Math.sin(a))
      const y = Math.round(cy - r * Math.cos(a))
      if (x >= 0 && x < ancho && y >= 0 && y < alto) {
        if (etiquetas[y * ancho + x] === etiqueta) {
          hit = true
          break
        }
      } else {
        adentro = false
      }
    }
    cubre.push(hit)
    dentro.push(adentro)
  }
  const nDentro = dentro.filter(Boolean).length
  if (nDentro / dentro.length < 0.6) return null
  const cobertura = cubre.filter((c, i) => c && dentro[i]).length / nDentro

  // Abertura = tramo circular más largo sin cubrir (fuera de imagen cuenta como cubierto).
  const n = cubre.length
  let mejorLargo = 0
  let mejorFin = 0
  let run = 0
  for (let i = 0; i < 2 * n; i++) {
    const j = i % n
    const v = cubre[j] || !dentro[j]
    run = v ? 0 : run + 1
    if (run > mejorLargo && run <= n) {
      mejorLargo = run
      mejorFin = i
    }
  }
  const abertura = {
    largo: mejorLargo * paso,
    centro: (((mejorFin - mejorLargo / 2 + 0.5) * paso) % 360 + 360) % 360,
  }

  // Barra: trazos gruesos en la corona exterior al arco.
  const rIn = 1.25 * R
  const rOut = 2.3 * R
  const x0 = Math.max(0, Math.floor(cx - rOut))
  const x1 = Math.min(ancho - 1, Math.ceil(cx + rOut))
  const y0 = Math.max(0, Math.floor(cy - rOut))
  const y1 = Math.min(alto - 1, Math.ceil(cy + rOut))
  const px = []
  const py = []
  const ang = []
  const hist = new Array(36).fill(0)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!grueso[y * ancho + x]) continue
      const dx = x - cx
      const dy = y - cy
      const rr = Math.hypot(dx, dy)
      if (rr < rIn || rr > rOut) continue
      const a = anguloDe(dx, dy)
      px.push(dx)
      py.push(dy)
      ang.push(a)
      hist[Math.floor(a / 10) % 36]++
    }
  }
  if (px.length < 10) return { cobertura, abertura, barra: null }

  // Ventana de 30° con más tinta = dirección de la barra.
  let jMejor = 0
  let vMejor = -1
  for (let j = 0; j < 36; j++) {
    const v = hist[j] + hist[(j + 1) % 36] + hist[(j + 2) % 36]
    if (v > vMejor) {
      vMejor = v
      jMejor = j
    }
  }
  const centroVentana = ((jMejor + 1) % 36) * 10 + 5
  const sel = []
  ang.forEach((a, i) => {
    if (Math.abs(difAngular(a, centroVentana)) <= 25) sel.push(i)
  })
  const concentracion = sel.length / ang.length
  if (sel.length < 8) return { cobertura, abertura, barra: null }

  let mx = 0
  let my = 0
  sel.forEach((i) => {
    mx += px[i]
    my += py[i]
  })
  mx /= sel.length
  my /= sel.length
  let sxx = 0
  let syy = 0
  let sxy = 0
  sel.forEach((i) => {
    const dx = px[i] - mx
    const dy = py[i] - my
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
  })
  const tr = (sxx + syy) / 2
  const disc = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy)
  const l1 = tr + disc
  const l2 = tr - disc
  let ux = sxy
  let uy = l1 - sxx
  if (Math.hypot(ux, uy) < 1e-9) {
    ux = l1 - syy
    uy = sxy
  }
  const norma = Math.hypot(ux, uy) || 1
  ux /= norma
  uy /= norma
  if (ux * mx + uy * my < 0) {
    ux = -ux
    uy = -uy
  }
  let pMin = Infinity
  let pMax = -Infinity
  sel.forEach((i) => {
    const p = px[i] * ux + py[i] * uy
    if (p < pMin) pMin = p
    if (p > pMax) pMax = p
  })
  return {
    cobertura,
    abertura,
    barra: {
      angulo: anguloDe(ux, uy),
      concentracion,
      alargamiento: Math.sqrt(l1 / Math.max(l2, 1e-6)),
      largoRelativo: (pMax - pMin) / R,
      pixeles: sel.length,
    },
  }
}

function motivoDescarte(m) {
  if (!m) return 'el anillo queda casi todo fuera de la imagen'
  if (!m.barra) return 'no hay una barra gruesa fuera del arco'
  if (m.cobertura < 0.5 || m.cobertura > 0.92) return `el arco cubre ${Math.round(m.cobertura * 100)}% del círculo (se espera 50-92%)`
  if (m.abertura.largo < 45 || m.abertura.largo > 170) return `abertura de ${m.abertura.largo}° (se espera 45-170°)`
  if (m.barra.concentracion < 0.5) return 'la tinta fuera del arco no está concentrada en una dirección'
  if (m.barra.largoRelativo < 0.4) return 'la barra es muy corta'
  if (m.barra.alargamiento < 2.5) return 'la mancha fuera del arco no es una barra recta'
  return null
}

/**
 * Busca el símbolo de norte en la imagen (Mat RGBA de OpenCV). Pura: no
 * toca el DOM, así se puede probar en Node con planos reales.
 *
 * @returns {{ escala:number, mejor:object|null, candidatos:object[] }}
 *   candidatos: los mejores círculos probados (aceptados y descartados, con
 *   el motivo), en coordenadas de la imagen original.
 */
export function buscarSimboloNorte(cv, rgba) {
  const escala = Math.min(1, LADO_TRABAJO / Math.max(rgba.cols, rgba.rows))
  const gris = new cv.Mat()
  const chica = new cv.Mat()
  const tinta = new cv.Mat()
  const dist = new cv.Mat()
  const nucleo = new cv.Mat()
  const nucleo8 = new cv.Mat()
  const grueso = new cv.Mat()
  const etiquetas = new cv.Mat()
  const stats = new cv.Mat()
  const centroides = new cv.Mat()
  const probados = []
  try {
    cv.cvtColor(rgba, gris, rgba.channels() === 4 ? cv.COLOR_RGBA2GRAY : cv.COLOR_RGB2GRAY)
    if (escala < 1) {
      const tam = new cv.Size(Math.round(rgba.cols * escala), Math.round(rgba.rows * escala))
      cv.resize(gris, chica, tam, 0, 0, cv.INTER_AREA)
    } else {
      gris.copyTo(chica)
    }
    const ancho = chica.cols
    const alto = chica.rows
    const lado = Math.min(ancho, alto)
    cv.adaptiveThreshold(chica, tinta, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY_INV, 51, 12)
    cv.distanceTransform(tinta, dist, cv.DIST_L2, 3)

    for (const T of UMBRALES_GROSOR) {
      cv.threshold(dist, nucleo, T - 1e-3, 255, cv.THRESH_BINARY)
      nucleo.convertTo(nucleo8, cv.CV_8U)
      const k = Math.floor(2 * T + 1)
      const elem = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(k, k))
      cv.dilate(nucleo8, grueso, elem)
      elem.delete()
      const nEtiquetas = cv.connectedComponentsWithStats(grueso, etiquetas, stats, centroides, 8, cv.CV_32S)
      const lab = etiquetas.data32S
      const st = stats.data32S
      const gr = grueso.data

      for (let e = 1; e < nEtiquetas; e++) {
        const bx = st[e * 5]
        const by = st[e * 5 + 1]
        const bw = st[e * 5 + 2]
        const bh = st[e * 5 + 3]
        if (Math.max(bw, bh) < lado * 0.02 || Math.max(bw, bh) > lado * 0.8) continue
        const xs = []
        const ys = []
        for (let y = by; y < by + bh; y++) {
          for (let x = bx; x < bx + bw; x++) {
            if (lab[y * ancho + x] === e) {
              xs.push(x)
              ys.push(y)
            }
          }
        }
        if (xs.length < 30) continue

        // RANSAC de 3 puntos: el círculo que más píxeles de la mancha explica.
        const azar = mulberry32(1)
        const paso = Math.max(1, Math.floor(xs.length / 4000))
        let mejor = null
        for (let it = 0; it < 150; it++) {
          const tri = [0, 1, 2].map(() => Math.floor(azar() * xs.length))
          if (tri[0] === tri[1] || tri[1] === tri[2] || tri[0] === tri[2]) continue
          const c = ajustarCirculo(xs, ys, tri)
          if (!c || c.r < lado * 0.01 || c.r > lado * 0.3) continue
          let inl = 0
          for (let i = 0; i < xs.length; i += paso) {
            if (Math.abs(Math.hypot(xs[i] - c.cx, ys[i] - c.cy) - c.r) < 0.12 * c.r) inl++
          }
          if (!mejor || inl > mejor.inl) mejor = { inl, c }
        }
        if (!mejor) continue
        let circ = mejor.c
        for (let rep = 0; rep < 2 && circ; rep++) {
          const idx = []
          for (let i = 0; i < xs.length; i++) {
            if (Math.abs(Math.hypot(xs[i] - circ.cx, ys[i] - circ.cy) - circ.r) < 0.2 * circ.r) idx.push(i)
          }
          circ = idx.length >= 20 ? ajustarCirculo(xs, ys, idx) : null
        }
        if (!circ || circ.r < Math.max(12, lado * 0.01) || circ.r > lado * 0.3) continue

        const m = medirSimbolo(gr, lab, e, ancho, alto, circ.cx, circ.cy, circ.r)
        const motivo = motivoDescarte(m)
        let puntaje = null
        let coherencia = null
        if (m?.barra) {
          // Abertura esperada: 90° en sentido horario desde la barra (el este).
          coherencia = difAngular(m.abertura.centro, m.barra.angulo + 90)
          puntaje =
            m.barra.concentracion + m.cobertura + (1 - Math.abs(coherencia) / 60) + Math.min(m.barra.alargamiento, 8) / 8
        }
        probados.push({
          umbralGrosor: T,
          centro: { x: Math.round(circ.cx / escala), y: Math.round(circ.cy / escala) },
          radio: Math.round(circ.r / escala),
          norteDeg: m?.barra ? r1(m.barra.angulo) : null,
          coberturaArco: m ? r1(m.cobertura * 100) : null,
          abertura: m ? { centroDeg: r1(m.abertura.centro), largoDeg: m.abertura.largo } : null,
          barra: m?.barra
            ? {
                concentracion: r1(m.barra.concentracion * 100),
                alargamiento: r1(m.barra.alargamiento),
                largoEnRadios: r1(m.barra.largoRelativo),
              }
            : null,
          coherenciaAberturaDeg: coherencia == null ? null : r1(coherencia),
          puntaje: puntaje == null ? null : Math.round(puntaje * 100) / 100,
          descartado: motivo || (puntaje < PUNTAJE_MINIMO ? `puntaje ${puntaje.toFixed(2)} < ${PUNTAJE_MINIMO}` : null),
        })
      }
    }
  } finally {
    ;[gris, chica, tinta, dist, nucleo, nucleo8, grueso, etiquetas, stats, centroides].forEach((m) => m.delete())
  }

  probados.sort((a, b) => (b.puntaje ?? -99) - (a.puntaje ?? -99))
  const mejor = probados.find((p) => !p.descartado) || null
  return { escala, mejor, candidatos: probados.slice(0, 8) }
}

/**
 * @param {Blob} blob                 imagen de la pagina del plano
 * @param {Array<{points:number[][],text:string}>} bloquesOcr  salida de ocrImage() sobre esa misma imagen
 * @returns {Promise<{angleDeg:number, confidence:'alta'|'media'|'baja', origen:string, diagnostico:object}>}
 */
export async function detectNorth(blob, bloquesOcr) {
  // Solo para el log: si el OCR leyó alguna "N" suelta, dónde.
  const letrasN = (bloquesOcr || [])
    .filter((b) => /^n\.?$/i.test((b.text || '').trim()))
    .map((b) => {
      const c = blockCenter(b)
      return { x: Math.round(c.x), y: Math.round(c.y) }
    })

  let cv
  try {
    cv = await getCv()
  } catch {
    return { angleDeg: 0, confidence: 'baja', origen: 'no se pudo cargar OpenCV', diagnostico: { letrasN } }
  }

  let mat
  try {
    mat = await matFromBlob(cv, blob)
    const { escala, mejor, candidatos } = buscarSimboloNorte(cv, mat)
    const diagnostico = { metodo: 'simbolo', escalaTrabajo: r1(escala * 100) / 100, letrasN, simbolo: mejor, candidatos }
    if (!mejor) {
      // Segundo estilo de simbolo (anillo + flecha rellena, "formato 2").
      const flecha = buscarSimboloNorteFlecha(cv, mat)
      diagnostico.flecha = { escalaTrabajo: r1(flecha.escala * 100) / 100, simbolo: flecha.mejor, candidatos: flecha.candidatos }
      if (flecha.mejor) {
        const f = flecha.mejor
        return {
          angleDeg: f.norteDeg,
          confidence: f.coberturaAnillo >= 90 && f.flecha.baseEnRadios <= 0.8 ? 'alta' : 'media',
          origen: `símbolo de norte (anillo y flecha) en (${f.centro.x}, ${f.centro.y}), radio ${f.radio} px`,
          diagnostico,
        }
      }
      return {
        angleDeg: 0,
        confidence: 'baja',
        origen: 'no se encontró el símbolo de norte',
        diagnostico,
      }
    }
    const confidence =
      mejor.puntaje >= PUNTAJE_ALTA && Math.abs(mejor.coherenciaAberturaDeg) <= 35 ? 'alta' : 'media'
    return {
      angleDeg: mejor.norteDeg,
      confidence,
      origen: `símbolo de norte en (${mejor.centro.x}, ${mejor.centro.y}), radio ${mejor.radio} px`,
      diagnostico,
    }
  } catch (e) {
    console.log('[planNorthDetector] fallo la deteccion, se usa 0°', e)
    return { angleDeg: 0, confidence: 'baja', origen: 'error de detección', diagnostico: { letrasN, error: String(e?.message || e) } }
  } finally {
    mat?.delete()
  }
}

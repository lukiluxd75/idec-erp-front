/**
 * Tercer estilo de símbolo de norte de los planos de P.H. ("formato 3"):
 *
 *   - un OVALO formado por DOS MEDIAS LUNAS gruesas y negras (una a cada lado,
 *     al este y al oeste) con el centro en blanco,
 *   - una CRUZ de líneas finas que atraviesa el óvalo y sobresale por sus
 *     cuatro lados; la línea vertical es el eje norte-sur,
 *   - la letra "N" en negrita, pegada al extremo NORTE de la línea vertical
 *     (arriba y a la derecha de ella).
 *
 * Se busca por FORMA con OpenCV (el OCR no lee la "N" de forma fiable):
 *
 *   1. Zonas oscuras rellenas (bastante más oscuras que el papel de alrededor)
 *      y abiertas con un núcleo de 5x5: solo quedan manchas gruesas -- las
 *      medias lunas, las letras en negrita del rótulo, muros llenos.
 *   2. Pares de manchas verticales parecidas, una a cada lado de un centro,
 *      con la separación de un óvalo (la "pareja de lunas").
 *   3. La cruz: sobre el centro de la pareja hay que encontrar tinta fina
 *      continua en los cuatro brazos (se prueba una inclinación de -15° a
 *      +15°: los planos escaneados salen algo torcidos). Las letras de un
 *      título en negrita forman parejas parecidas pero no tienen cruz.
 *   3b. Se exigen al menos 3 de los 4 brazos: un doblez o el borde de la hoja
 *      pueden tapar uno.
 *   4. El norte es el extremo de la línea vertical que tiene la "N" gruesa al
 *      lado; si no se distingue, el brazo vertical más largo.
 *
 * Si la hoja está girada 90° las lunas quedan arriba y abajo: si no aparece
 * nada derecho se vuelve a probar con la imagen girada y se corrige el ángulo.
 *
 * Misma convención que planNorthDetector.js: angleDeg es el ángulo (grados,
 * sentido horario) al que apunta el norte, con "arriba" = 0°. Pura: no toca el
 * DOM.
 */

const LADO_TRABAJO = 1600
const BRAZO_MINIMO = 0.6 // fracción de píxeles con tinta a lo largo de un brazo para darlo por visto
const BRAZOS_MINIMOS = 3
const MAX_CANDIDATOS = 6

const r1 = (v) => Math.round(v * 10) / 10

/** Cobertura de tinta fina a lo largo del rayo (cx,cy) + t*(ux,uy), t en [t0,t1], con 1 px de holgura. */
function coberturaRayo(tinta, ancho, alto, cx, cy, ux, uy, t0, t1) {
  let con = 0
  let total = 0
  for (let t = t0; t <= t1; t += 1) {
    const x = cx + ux * t
    const y = cy + uy * t
    total++
    let hay = false
    for (let o = -1; o <= 1 && !hay; o++) {
      const px = Math.round(x - uy * o)
      const py = Math.round(y + ux * o)
      if (px >= 0 && px < ancho && py >= 0 && py < alto && tinta[py * ancho + px]) hay = true
    }
    if (hay) con++
  }
  return total ? con / total : 0
}

/** Masa de tinta gruesa dentro de la caja [d0,d1] a lo largo de (ux,uy) y [l0,l1] a lo ancho (vector (-uy,ux)). */
function masaGruesa(grueso, ancho, alto, cx, cy, ux, uy, d0, d1, l0, l1) {
  let masa = 0
  for (let d = d0; d <= d1; d += 1) {
    for (let l = l0; l <= l1; l += 1) {
      const x = Math.round(cx + ux * d - uy * l)
      const y = Math.round(cy + uy * d + ux * l)
      if (x >= 0 && x < ancho && y >= 0 && y < alto && grueso[y * ancho + x]) masa++
    }
  }
  return masa
}

/** Prueba una pareja de lunas p (izq) / q (der); devuelve el análisis o null. Coordenadas del espacio de trabajo. */
function analizarPareja(p, q, tinta, grueso, ancho, alto) {
  const cx = (p.cx + q.cx) / 2
  const cy = (p.cy + q.cy) / 2
  const hh = (p.h + q.h) / 4 // medio alto de las lunas = medio alto del óvalo
  const mediaAncho = (q.cx - p.cx) / 2 + (p.w + q.w) / 4
  let mejor = null
  // Inclinación del eje norte-sur respecto a la vertical (grados, horario).
  for (let delta = -15; delta <= 15; delta += 1) {
    const rad = (delta * Math.PI) / 180
    const nx = Math.sin(rad)
    const ny = -Math.cos(rad) // norte
    const ex = Math.cos(rad)
    const ey = Math.sin(rad) // este
    const norte = coberturaRayo(tinta, ancho, alto, cx, cy, nx, ny, hh * 1.2, hh * 1.7)
    const sud = coberturaRayo(tinta, ancho, alto, cx, cy, -nx, -ny, hh * 1.2, hh * 1.7)
    const este = coberturaRayo(tinta, ancho, alto, cx, cy, ex, ey, mediaAncho + hh * 0.2, mediaAncho + hh * 0.6)
    const oeste = coberturaRayo(tinta, ancho, alto, cx, cy, -ex, -ey, mediaAncho + hh * 0.2, mediaAncho + hh * 0.6)
    const suma = norte + sud + este + oeste
    if (!mejor || suma > mejor.suma) mejor = { delta, norte, sud, este, oeste, suma, nx, ny }
  }
  const brazos = [mejor.norte, mejor.sud, mejor.este, mejor.oeste].filter((c) => c >= BRAZO_MINIMO).length
  // Los dos brazos verticales cruzan el óvalo: sin al menos uno de ellos no hay eje.
  if (brazos < BRAZOS_MINIMOS || (mejor.norte < BRAZO_MINIMO && mejor.sud < BRAZO_MINIMO)) {
    return { descartado: `solo ${brazos} brazo(s) de cruz con tinta (se esperan >= ${BRAZOS_MINIMOS})`, mejor, cx, cy, hh }
  }
  // La "N": masa gruesa a un lado del extremo de cada brazo vertical.
  const nx = mejor.nx
  const ny = mejor.ny
  const masaN = masaGruesa(grueso, ancho, alto, cx, cy, nx, ny, hh * 1.0, hh * 2.4, hh * 0.05, hh * 1.3)
  const masaS = masaGruesa(grueso, ancho, alto, cx, cy, -nx, -ny, hh * 1.0, hh * 2.4, hh * 0.05, hh * 1.3)
  let arriba = masaN >= masaS
  const claro = Math.max(masaN, masaS) >= 1.5 * Math.max(1, Math.min(masaN, masaS))
  if (!claro) arriba = mejor.norte >= mejor.sud
  const normas = ((arriba ? Math.atan2(nx, -ny) : Math.atan2(-nx, ny)) * 180) / Math.PI
  return {
    descartado: null,
    cx,
    cy,
    hh,
    mejor,
    claroN: claro,
    masaN,
    masaS,
    norteDeg: ((normas % 360) + 360) % 360,
    puntaje: Math.round((mejor.suma / 4 + (claro ? 0.5 : 0)) * 100) / 100,
    brazos,
  }
}

function buscarEnMat(cv, gris, escala) {
  const chica = new cv.Mat()
  const fondo = new cv.Mat()
  const umbral = new cv.Mat()
  const oscura = new cv.Mat()
  const grueso = new cv.Mat()
  const tinta = new cv.Mat()
  const nucleo = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5))
  const etiquetas = new cv.Mat()
  const stats = new cv.Mat()
  const centroides = new cv.Mat()
  const probados = []
  try {
    if (escala < 1) {
      const tam = new cv.Size(Math.round(gris.cols * escala), Math.round(gris.rows * escala))
      cv.resize(gris, chica, tam, 0, 0, cv.INTER_AREA)
    } else {
      gris.copyTo(chica)
    }
    const ancho = chica.cols
    const alto = chica.rows
    const lado = Math.max(ancho, alto)
    const k = Math.max(51, Math.round(lado * 0.08) | 1)
    cv.blur(chica, fondo, new cv.Size(k, k))
    fondo.convertTo(umbral, -1, 0.62, 0)
    cv.compare(chica, umbral, oscura, cv.CMP_LT)
    cv.morphologyEx(oscura, grueso, cv.MORPH_OPEN, nucleo)
    // Tinta fina (la cruz): umbral local, como en planNorthDetector.js.
    cv.adaptiveThreshold(chica, tinta, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY_INV, 51, 12)

    const n = cv.connectedComponentsWithStats(grueso, etiquetas, stats, centroides, 8, cv.CV_32S)
    const st = stats.data32S
    const comps = []
    for (let e = 1; e < n; e++) {
      const w = st[e * 5 + 2]
      const h = st[e * 5 + 3]
      const area = st[e * 5 + 4]
      if (Math.max(w, h) < lado * 0.012 || Math.max(w, h) > lado * 0.09 || area < 40) continue
      comps.push({ cx: st[e * 5] + w / 2, cy: st[e * 5 + 1] + h / 2, w, h, relleno: area / (w * h) })
    }
    // `.data` se lee DESPUES de las ultimas asignaciones de OpenCV (el heap de WASM puede crecer).
    const tintaData = tinta.data
    const gruesoData = grueso.data
    for (const p of comps) {
      for (const q of comps) {
        if (p.cx >= q.cx) continue
        const hh = (p.h + q.h) / 2
        if (Math.abs(p.h - q.h) > 0.35 * hh || Math.abs(p.cy - q.cy) > 0.25 * hh) continue
        const dx = q.cx - p.cx
        if (dx < 0.6 * hh || dx > 2.4 * hh) continue
        // Medias lunas: más altas que anchas y con huecos (no un bloque lleno).
        if (p.h < 0.9 * p.w || q.h < 0.9 * q.w) continue
        if (Math.max(p.relleno, q.relleno) > 0.75 || Math.min(p.relleno, q.relleno) < 0.2) continue
        const a = analizarPareja(p, q, tintaData, gruesoData, ancho, alto)
        probados.push({
          centro: { x: Math.round(a.cx / escala), y: Math.round(a.cy / escala) },
          radio: Math.round(a.hh / escala),
          norteDeg: a.descartado ? null : r1(a.norteDeg),
          brazos: a.descartado ? null : a.brazos,
          coberturas: {
            norte: r1(a.mejor.norte * 100),
            sud: r1(a.mejor.sud * 100),
            este: r1(a.mejor.este * 100),
            oeste: r1(a.mejor.oeste * 100),
          },
          inclinacionDeg: a.mejor.delta,
          letraNClara: a.claroN ?? null,
          puntaje: a.descartado ? null : a.puntaje,
          descartado: a.descartado,
        })
      }
    }
  } finally {
    ;[chica, fondo, umbral, oscura, grueso, tinta, nucleo, etiquetas, stats, centroides].forEach((m) => m.delete())
  }
  return probados
}

/**
 * Busca el símbolo de norte "óvalo de dos lunas + cruz + N" en la imagen
 * (Mat RGBA o RGB).
 *
 * @returns {{ escala:number, mejor:object|null, candidatos:object[] }}
 *   coordenadas en la imagen original.
 */
export function buscarSimboloNorteCruz(cv, rgba) {
  const escala = Math.min(1, LADO_TRABAJO / Math.max(rgba.cols, rgba.rows))
  const gris = new cv.Mat()
  const girada = new cv.Mat()
  let probados = []
  try {
    cv.cvtColor(rgba, gris, rgba.channels() === 4 ? cv.COLOR_RGBA2GRAY : cv.COLOR_RGB2GRAY)
    probados = buscarEnMat(cv, gris, escala)
    if (!probados.some((p) => !p.descartado)) {
      // Hoja girada 90°: las lunas quedan arriba y abajo. Se gira la imagen en
      // sentido horario (lo que estaba a la izquierda queda arriba) y se
      // corrige el ángulo y el centro al volver.
      cv.rotate(gris, girada, cv.ROTATE_90_CLOCKWISE)
      const dePie = buscarEnMat(cv, girada, escala).filter((p) => !p.descartado)
      dePie.forEach((p) => {
        // (x', y') de la imagen girada -> original: x = y', y = H - x'.
        const x = p.centro.y
        const y = gris.rows - p.centro.x
        probados.push({
          ...p,
          centro: { x, y },
          norteDeg: r1((p.norteDeg - 90 + 360) % 360),
          girada90: true,
        })
      })
    }
  } finally {
    ;[gris, girada].forEach((m) => m.delete())
  }
  probados.sort((a, b) => (b.puntaje ?? -99) - (a.puntaje ?? -99))
  const mejor = probados.find((p) => !p.descartado) || null
  return { escala, mejor, candidatos: probados.slice(0, MAX_CANDIDATOS) }
}

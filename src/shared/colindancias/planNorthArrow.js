/**
 * Segundo estilo de símbolo de norte de los planos del GAMC ("formato 2"):
 *
 *   - un ANILLO (círculo completo, trazo medio),
 *   - una PUNTA DE FLECHA larga y angosta cuya mitad está rellena de negro (la
 *     otra mitad, rayada), que sale del centro del anillo y sobresale por
 *     fuera de él,
 *   - la letra "N" y dos líneas finas en cruz, del lado OPUESTO a la punta.
 *
 * El norte es la dirección centro del anillo -> punta de la flecha.
 *
 * Se busca por FORMA con OpenCV (el OCR casi nunca lee esa "N"):
 *
 *   1. Manchas gruesas (transformada de distancia): la mitad rellena de la
 *      flecha es lo único de ese grosor y de forma triangular alargada
 *      (se afina hacia la punta) que hay en el plano. Muros, columnas y
 *      textos quedan fuera por forma (cuadrados, rectángulos parejos).
 *   2. De la mancha se saca la punta (extremo angosto) y el eje.
 *   3. Se busca el anillo con centro cerca del eje: el círculo cuyo contorno
 *      está cubierto de tinta y que deja la punta por fuera.
 *
 * Misma convención que planNorthDetector.js: angleDeg es el ángulo (grados,
 * sentido horario) al que apunta el norte, con "arriba" = 0°. Pura: no toca el
 * DOM, se puede probar en Node con planos reales.
 */

// Lado mayor de la imagen de trabajo. Mayor que el de planNorthDetector.js
// (1600): este símbolo es chico y fino frente al plano entero (un anillo de
// ~70 px en una imagen de 4000).
const LADO_TRABAJO = 3200
// De mas a menos grueso: en una foto cercana el anillo ya es grueso y se pega a la
// flecha, solo con un umbral alto queda la flecha sola.
const UMBRALES_GROSOR = [8, 6, 5, 4, 3, 2.5, 2]
const MAX_CANDIDATOS = 8
const COBERTURA_MINIMA = 0.55 // medida con tolerancia FINA (despues del afinado)

const r1 = (v) => Math.round(v * 10) / 10

function anguloDe(dx, dy) {
  return (((Math.atan2(dx, -dy) * 180) / Math.PI) % 360 + 360) % 360
}

/**
 * Forma de una mancha (píxeles xs/ys): eje principal, largo, y si se afina
 * hacia un extremo. Devuelve null si no es alargada y triangular.
 */
function analizarMancha(xs, ys) {
  const n = xs.length
  let mx = 0
  let my = 0
  for (let i = 0; i < n; i++) {
    mx += xs[i]
    my += ys[i]
  }
  mx /= n
  my /= n
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx
    const dy = ys[i] - my
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
  }
  const tr = (sxx + syy) / 2
  const disc = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy)
  const l1 = tr + disc
  const l2 = Math.max(tr - disc, 1e-6)
  let ux = sxy
  let uy = l1 - sxx
  if (Math.hypot(ux, uy) < 1e-9) {
    ux = l1 - syy
    uy = sxy
  }
  const norma = Math.hypot(ux, uy) || 1
  ux /= norma
  uy /= norma
  const vx = -uy
  const vy = ux

  let pMin = Infinity
  let pMax = -Infinity
  for (let i = 0; i < n; i++) {
    const p = (xs[i] - mx) * ux + (ys[i] - my) * uy
    if (p < pMin) pMin = p
    if (p > pMax) pMax = p
  }
  const largo = pMax - pMin
  if (largo < 8) return null

  // Ancho (extensión perpendicular) por tramo a lo largo del eje.
  const TRAMOS = 6
  const wMin = new Array(TRAMOS).fill(Infinity)
  const wMax = new Array(TRAMOS).fill(-Infinity)
  const cuenta = new Array(TRAMOS).fill(0)
  for (let i = 0; i < n; i++) {
    const p = (xs[i] - mx) * ux + (ys[i] - my) * uy
    const q = (xs[i] - mx) * vx + (ys[i] - my) * vy
    const t = Math.min(TRAMOS - 1, Math.floor(((p - pMin) / largo) * TRAMOS))
    if (q < wMin[t]) wMin[t] = q
    if (q > wMax[t]) wMax[t] = q
    cuenta[t]++
  }
  const ancho = wMax.map((m, t) => (cuenta[t] ? m - wMin[t] + 1 : 0))
  const anchoIni = (ancho[0] + ancho[1]) / 2
  const anchoFin = (ancho[TRAMOS - 2] + ancho[TRAMOS - 1]) / 2
  // La punta es el extremo mas angosto.
  const puntaAlFinal = anchoFin < anchoIni
  const anchoPunta = Math.max(1, puntaAlFinal ? anchoFin : anchoIni)
  const anchoBase = puntaAlFinal ? anchoIni : anchoFin
  const anchoMax = Math.max(...ancho)
  const sentido = puntaAlFinal ? 1 : -1 // signo de u que apunta hacia la punta
  return {
    cx: mx,
    cy: my,
    // eje unitario apuntando hacia la PUNTA
    ux: ux * sentido,
    uy: uy * sentido,
    largo,
    anchoMax,
    afinado: anchoBase / anchoPunta,
    alargamiento: largo / Math.max(anchoMax, 1),
    elongacionPCA: Math.sqrt(l1 / l2),
    // extremos sobre el eje (ya orientado a la punta), relativos al centroide
    pPunta: puntaAlFinal ? pMax : -pMin,
    pBase: puntaAlFinal ? pMin : -pMax,
    pixeles: n,
  }
}

/**
 * Cubrimiento del contorno de un círculo (cx,cy,R) por tinta delgada: fracción
 * de ángulos (cada 5°) con tinta en radio R±tol. Fuera de imagen = no cubre.
 */
function coberturaAnillo(tinta, ancho, alto, cx, cy, R, fino = false) {
  const tol = fino ? Math.max(1, R * 0.03) : Math.max(1.5, R * 0.07)
  let ok = 0
  let total = 0
  for (let d = 0; d < 360; d += 5) {
    const a = (d * Math.PI) / 180
    total++
    let hit = false
    for (let k = -1; k <= 1 && !hit; k++) {
      const r = R + k * tol
      const x = Math.round(cx + r * Math.sin(a))
      const y = Math.round(cy - r * Math.cos(a))
      if (x >= 0 && x < ancho && y >= 0 && y < alto && tinta[y * ancho + x]) hit = true
    }
    if (hit) ok++
  }
  return ok / total
}

/**
 * Fracción de tinta DENTRO del círculo (muestras a 3 radios). El anillo del
 * símbolo deja casi todo el interior en blanco (salvo la flecha y su rayado);
 * un cúmulo de tinta con forma de círculo chico (texto, rayados) lo llena.
 */
function tintaInterior(tinta, ancho, alto, cx, cy, R) {
  let hit = 0
  let total = 0
  for (const f of [0.3, 0.55, 0.72]) {
    for (let d = 0; d < 360; d += 15) {
      const a = (d * Math.PI) / 180
      const x = Math.round(cx + R * f * Math.sin(a))
      const y = Math.round(cy - R * f * Math.cos(a))
      total++
      if (x >= 0 && x < ancho && y >= 0 && y < alto && tinta[y * ancho + x]) hit++
    }
  }
  return hit / total
}

const INTERIOR_MAXIMO = 0.55

/**
 * Busca el anillo del símbolo para una mancha-flecha: centro cerca del eje de
 * la mancha, y la punta SALIENDO del círculo. El nucleo grueso de la mancha
 * pierde la punta y parte de la base, asi que el radio se busca en un rango
 * ancho respecto de su largo (la flecha completa mide ~1.7-2 radios).
 */
function buscarAnillo(tinta, ancho, alto, m, ptaX, ptaY) {
  const L = m.pPunta - m.pBase
  const vx = -m.uy
  const vy = m.ux
  let mejor = null
  for (let R = Math.max(10, L * 0.35); R <= L * 2.2; R *= 1.06) {
    for (let d = R * 1.1; d <= R * 2.2; d += Math.max(1.5, R * 0.04)) {
      // centro = punta - d * u  (u apunta a la punta)
      const bx = ptaX - d * m.ux
      const by = ptaY - d * m.uy
      for (let o = -0.5 * R; o <= 0.5 * R; o += Math.max(1.5, R * 0.08)) {
        const cx = bx + o * vx
        const cy = by + o * vy
        const cob = coberturaAnillo(tinta, ancho, alto, cx, cy, R)
        if (mejor && cob <= mejor.cob) continue
        const interior = tintaInterior(tinta, ancho, alto, cx, cy, R)
        if (interior > INTERIOR_MAXIMO) continue
        mejor = { cx, cy, R, cob, interior }
      }
    }
  }
  if (!mejor) return null

  // Afinado: el barrido de arriba es grueso (pasos de varios px) y tolera un
  // anillo corrido; un circulo REAL calza apretado con tolerancia fina, el
  // cumulo de trazos que solo se le parece, no. Se busca alrededor del mejor.
  const paso = Math.max(1, mejor.R * 0.02)
  let fino = { ...mejor, cob: coberturaAnillo(tinta, ancho, alto, mejor.cx, mejor.cy, mejor.R, true) }
  for (let i = -6; i <= 6; i++) {
    for (let j = -6; j <= 6; j++) {
      for (let k = -4; k <= 4; k++) {
        const cx = mejor.cx + i * paso
        const cy = mejor.cy + j * paso
        const R = mejor.R + k * paso
        if (R < 6) continue
        const cob = coberturaAnillo(tinta, ancho, alto, cx, cy, R, true)
        if (cob > fino.cob) fino = { ...mejor, cx, cy, R, cob }
      }
    }
  }
  fino.interior = tintaInterior(tinta, ancho, alto, fino.cx, fino.cy, fino.R)
  return fino
}

/**
 * Busca el símbolo de norte "anillo + flecha rellena" en la imagen (Mat RGBA).
 *
 * @returns {{ escala:number, mejor:object|null, candidatos:object[] }}
 *   coordenadas en la imagen original.
 */
export function buscarSimboloNorteFlecha(cv, rgba) {
  const escala = Math.min(1, LADO_TRABAJO / Math.max(rgba.cols, rgba.rows))
  const gris = new cv.Mat()
  const chica = new cv.Mat()
  const tinta = new cv.Mat()
  const fondo = new cv.Mat()
  const umbral = new cv.Mat()
  const oscura = new cv.Mat()
  const dist = new cv.Mat()
  const nucleo = new cv.Mat()
  const nucleo8 = new cv.Mat()
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
    const lado = Math.max(ancho, alto)
    // Tinta fina (lineas del anillo): umbral local, como en planNorthDetector.js.
    cv.adaptiveThreshold(chica, tinta, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY_INV, 51, 12)
    // Zonas OSCURAS rellenas: el umbral local de arriba las deja huecas cuando
    // son mas anchas que su ventana (la mitad negra de la flecha en una foto
    // cercana). Aca se compara contra el fondo de una ventana mucho mas grande
    // (~8% del lado): lo que es bastante mas oscuro que el papel de alrededor.
    const k = Math.max(51, Math.round(lado * 0.08) | 1)
    cv.blur(chica, fondo, new cv.Size(k, k))
    fondo.convertTo(umbral, -1, 0.62, 0)
    cv.compare(chica, umbral, oscura, cv.CMP_LT)
    cv.distanceTransform(oscura, dist, cv.DIST_L2, 3)
    cv.bitwise_or(tinta, oscura, tinta)

    const vistos = [] // manchas ya probadas (se repiten entre umbrales)
    for (const T of UMBRALES_GROSOR) {
      cv.threshold(dist, nucleo, T - 1e-3, 255, cv.THRESH_BINARY)
      nucleo.convertTo(nucleo8, cv.CV_8U)
      const n = cv.connectedComponentsWithStats(nucleo8, etiquetas, stats, centroides, 8, cv.CV_32S)
      const lab = etiquetas.data32S
      const st = stats.data32S
      // Se lee `.data` DESPUES de las ultimas asignaciones de OpenCV: si el heap de
      // WASM crece (imagenes grandes), las vistas tomadas antes quedan vacias.
      const tintaData = tinta.data

      for (let e = 1; e < n; e++) {
        const bx = st[e * 5]
        const by = st[e * 5 + 1]
        const bw = st[e * 5 + 2]
        const bh = st[e * 5 + 3]
        const area = st[e * 5 + 4]
        const lMax = Math.max(bw, bh)
        if (area < 25 || lMax < lado * 0.004 || lMax > lado * 0.1) continue
        // La misma mancha aparece en varios umbrales (cada vez mas grande): solo se
        // vuelve a probar si creció bastante (un nucleo mas chico puede haber
        // fallado en la forma o en el anillo por falta de largo).
        if (vistos.some((v) => Math.abs(v.x - (bx + bw / 2)) < 6 && Math.abs(v.y - (by + bh / 2)) < 6 && area < v.area * 1.4)) continue

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
        const m = analizarMancha(xs, ys)
        // Triangulo alargado que se afina: muros/columnas/textos no pasan.
        if (!m || m.alargamiento < 1.6 || m.alargamiento > 9 || m.afinado < 1.6) continue
        vistos.push({ x: bx + bw / 2, y: by + bh / 2, area })

        // Punta: extremo del nucleo, prolongado por la tinta hasta donde llega el
        // trazo (el nucleo grueso se come la punta fina). Tolera 6 pasos sin
        // tinta y mira 2.5 px a cada lado del eje (la punta fina se borra con el
        // desenfoque de una foto y el eje del nucleo no es exacto).
        let ptaX = m.cx + m.ux * m.pPunta
        let ptaY = m.cy + m.uy * m.pPunta
        let huecos = 0
        for (let k = 1; k <= m.largo * 2.5; k++) {
          const x = ptaX + m.ux
          const y = ptaY + m.uy
          const hay = [-2.5, -1.25, 0, 1.25, 2.5].some((o) => {
            const px = Math.round(x - m.uy * o)
            const py = Math.round(y + m.ux * o)
            return px >= 0 && px < ancho && py >= 0 && py < alto && tintaData[py * ancho + px]
          })
          if (!hay && ++huecos > 6) break
          if (hay) huecos = 0
          ptaX = x
          ptaY = y
        }
        // Se retrocede lo avanzado en vacio.
        ptaX -= m.ux * huecos
        ptaY -= m.uy * huecos

        const anillo = buscarAnillo(tintaData, ancho, alto, m, ptaX, ptaY)
        if (!anillo) continue
        const nx = ptaX - anillo.cx
        const ny = ptaY - anillo.cy
        const sobresale = Math.hypot(nx, ny) / anillo.R
        const dentro = Math.hypot(m.cx - anillo.cx, m.cy - anillo.cy) / anillo.R
        // El extremo ANCHO de la mancha (la base de la flecha) cae cerca del
        // centro del anillo, dentro de el.
        const baseEnRadios =
          Math.hypot(m.cx + m.ux * m.pBase - anillo.cx, m.cy + m.uy * m.pBase - anillo.cy) / anillo.R
        let descartado = null
        if (anillo.cob < COBERTURA_MINIMA) descartado = `el anillo cubre ${Math.round(anillo.cob * 100)}% (se espera >= ${Math.round(COBERTURA_MINIMA * 100)}%)`
        else if (sobresale < 1.1 || sobresale > 2.3) descartado = `la punta queda a ${r1(sobresale)} radios del centro (se espera 1.1-2.3)`
        else if (dentro > 1.0) descartado = 'la mancha rellena queda fuera del anillo'
        else if (baseEnRadios > 0.9) descartado = `la base de la flecha queda a ${r1(baseEnRadios)} radios del centro (se espera < 0.9)`
        probados.push({
          umbralGrosor: T,
          centro: { x: Math.round(anillo.cx / escala), y: Math.round(anillo.cy / escala) },
          radio: Math.round(anillo.R / escala),
          norteDeg: r1(anguloDe(nx, ny)),
          coberturaAnillo: r1(anillo.cob * 100),
          flecha: { afinado: r1(m.afinado), alargamiento: r1(m.alargamiento), puntaEnRadios: r1(sobresale), baseEnRadios: r1(baseEnRadios), interiorTinta: r1(anillo.interior * 100) },
          // La punta de la flecha sobresale ~1.75 radios del centro: una mancha
          // tomada del lado equivocado (extremo ancho) queda lejos de eso.
          puntaje:
            Math.round(
              (anillo.cob + Math.min(m.afinado, 5) / 10 + Math.min(m.alargamiento, 5) / 20 - Math.abs(sobresale - 1.75) * 0.5) *
                100,
            ) / 100,
          descartado,
        })
      }
    }
  } finally {
    ;[gris, chica, tinta, fondo, umbral, oscura, dist, nucleo, nucleo8, etiquetas, stats, centroides].forEach((m) => m.delete())
  }

  probados.sort((a, b) => (b.puntaje ?? -99) - (a.puntaje ?? -99))
  const mejor = probados.find((p) => !p.descartado) || null
  return { escala, mejor, candidatos: probados.slice(0, MAX_CANDIDATOS) }
}

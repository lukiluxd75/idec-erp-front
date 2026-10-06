
// ---------- 1.

const yCenter = (p) => (p[0][1] + p[2][1]) / 2
const xStartOf = (p) => Math.min(p[0][0], p[3][0])
const xEndOf = (p) => Math.max(p[1][0], p[2][0])

// Agrupa items (ya ordenados por y) en filas por gap fijo: arranca fila nueva cuando el salto en Y supera rowGapY.
function clusterByGap(items, rowGapY) {
  const rows = []
  items.forEach((it) => {
    const last = rows[rows.length - 1]
    if (!last || it.y - last.lastY > rowGapY) {
      rows.push({ y: it.y, lastY: it.y, items: [it] })
    } else {
      last.items.push(it)
      last.lastY = it.y
      last.y = (last.y * (last.items.length - 1) + it.y) / last.items.length
    }
  })
  return rows
}

function estimateRowSlope(items, columnGapX) {
  const xCenterOf = (it) => (it.xStart + it.xEnd) / 2
  const sorted = [...items].sort((a, b) => xCenterOf(a) - xCenterOf(b))
  const anchors = []
  sorted.forEach((it) => {
    const x = xCenterOf(it)
    const last = anchors[anchors.length - 1]
    if (!last || x - last.x > columnGapX) {
      anchors.push({ x, items: [it] })
    } else {
      last.items.push(it)
      last.x = x
    }
  })
  const maxLen = anchors.reduce((m, a) => Math.max(m, a.items.length), 0)
  const minLen = Math.max(4, Math.round(maxLen * 0.6))
  const columns = anchors
    .filter((a) => a.items.length >= minLen)
    .map((a) => ({
      x: a.items.reduce((sum, it) => sum + xCenterOf(it), 0) / a.items.length,
      items: [...a.items].sort((p, q) => p.y - q.y),
    }))

  const slopes = []
  for (let i = 0; i < columns.length; i++) {
    for (let j = i + 1; j < columns.length; j++) {
      const a = columns[i]
      const b = columns[j]
      if (a.items.length !== b.items.length) continue
      const dx = b.x - a.x
      if (Math.abs(dx) < 150) continue
      for (let k = 0; k < a.items.length; k++) slopes.push((b.items[k].y - a.items[k].y) / dx)
    }
  }
  if (slopes.length < 5) return 0
  slopes.sort((a, b) => a - b)
  const mid = Math.floor(slopes.length / 2)
  const slope = slopes.length % 2 ? slopes[mid] : (slopes[mid - 1] + slopes[mid]) / 2
  return Math.abs(slope) <= 0.2 ? slope : 0
}

function fusionarAnchorsFragmentados(anchors) {
  if (anchors.length < 3) return anchors
  const huecos = []
  for (let i = 1; i < anchors.length; i++) huecos.push(anchors[i] - anchors[i - 1])
  const ordenados = [...huecos].sort((a, b) => a - b)
  const mid = Math.floor(ordenados.length / 2)
  const huecoTipico = ordenados.length % 2 ? ordenados[mid] : (ordenados[mid - 1] + ordenados[mid]) / 2
  const umbral = huecoTipico * 0.5

  const merged = [anchors[0]]
  for (let i = 1; i < anchors.length; i++) {
    if (anchors[i] - merged[merged.length - 1] < umbral) continue
    merged.push(anchors[i])
  }
  return merged
}


// ---------- formato "NIVEL | DESCRIPCION | numeros" (columna de descripcion ancha) ----------
//
// En tablas con una columna de DESCRIPCION muy ancha y alineada a la izquierda
// ("LOCAL 1" vs "INGRESO PRINCIPAL + PASILLO DE CIRCULACION+..."), el centro del
// texto varia cientos de px entre filas y el agrupador por centro la parte en
// varias columnas falsas. Ademas el OCR a veces lee la celda NIVEL y la
// descripcion de al lado como UN solo bloque ("PLANTA2PISODEPARTAMENTOD").
// Solucion: (1) separar ese prefijo de nivel, (2) armar las columnas numericas
// SOLO con filas de datos (los encabezados no crean columnas), y (3) la zona de
// etiquetas a la izquierda de los numeros se clasifica por TIPO de texto
// (nivel / descripcion), no por distancia.
const normKey = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

// El OCR lee a veces la P de PLANTA como F/R y la O de PISO como 0.
const NIVEL_PREFIX_RE = /^[PFR]LANTA(BAJA|SOTANO|SEMISOTANO|\d{1,2}PIS[O0])$/
const NIVEL_ITEM_RE = /^(NIVEL|[PFR]LANTA(BAJA|SOTANO|SEMISOTANO|\d{1,2}PIS[O0])|SEMISOTANO|SOTANO|\d{1,2}PIS[O0]|CUBIERTA|AZOTEA|MEZZANINE|ENTREPISO)$/

const esItemNivel = (it) => NIVEL_ITEM_RE.test(normKey(it.text))

function esTokenNumerico(text) {
  const t = (text || '').replace(/\s+/g, '')
  if (!t || t.length > 10 || !/\d/.test(t)) return false
  return (t.match(/[0-9.,:;]/g) || []).length / t.length >= 0.7
}

// Si el bloque EMPIEZA con un nombre de nivel y le sigue mas texto, lo parte en
// dos items (el ancho se reparte por cantidad de letras).
function separarPrefijoNivel(it) {
  const total = normKey(it.text).length
  for (let i = 1; i < it.text.length; i++) {
    const k = normKey(it.text.slice(0, i))
    if (k.length > 16) return [it]
    if (!NIVEL_PREFIX_RE.test(k)) continue
    const resto = it.text.slice(i).trim()
    if (normKey(resto).length < 3) return [it]
    const frac = k.length / total
    const xCorte = it.xStart + (it.xEnd - it.xStart) * frac
    // Cada parte toma el Y del tramo del bloque que le toca (el bloque suele
    // venir inclinado: su centro no es el de ninguna de las dos mitades).
    const yEn = (f) => it.yIzq + (it.yDer - it.yIzq) * f
    return [
      { ...it, text: it.text.slice(0, i).trim(), xEnd: xCorte, y: yEn(frac / 2), yRaw: yEn(frac / 2) },
      { ...it, text: resto, xStart: xCorte, y: yEn((1 + frac) / 2), yRaw: yEn((1 + frac) / 2) },
    ]
  }
  return [it]
}

const medianOf = (arr) => {
  const a = [...arr].sort((x, y) => x - y)
  const mid = Math.floor(a.length / 2)
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2
}


// Arma las filas a partir de los NUMEROS (que si estan alineados fila a fila) y
// despues cuelga el resto del texto de la fila numerica mas cercana. Las
// etiquetas de la izquierda (descripcion/nivel) se comparan por su Y ORIGINAL
// contra el Y original del primer numero de cada fila: una foto con
// perspectiva no se inclina igual a la izquierda que a la derecha, y la
// pendiente global que se le resta a los numeros desfasaba toda la descripcion
// una fila. Lo que no queda cerca de ninguna fila (encabezados, titulos) arma
// sus propias filas con el gap de siempre. Devuelve null si no hay suficientes
// filas numericas (la tabla no tiene este formato) para que se use lo clasico.
function agruparFilasPorNumeros(items, rowGapY) {
  const numericos = items.filter((it) => esTokenNumerico(it.text))
  if (numericos.length < 8) return null
  const numLeft = numericos.reduce((m, it) => Math.min(m, it.xStart), Infinity)
  const centro = (it) => (it.xStart + it.xEnd) / 2
  const enEtiquetas = (it) => centro(it) < numLeft

  const enNumeros = numericos.filter((it) => !enEtiquetas(it)).sort((a, b) => a.y - b.y)
  // Con el gap fijo una fila de numeros cuyos valores quedaron algo desparejos
  // (pendiente mal estimada en una tabla larga) se parte en pedazos de menos de
  // 3 items y se pierde. Se mide el espaciado real entre filas y se vuelve a
  // agrupar con un gap proporcional a el.
  const previas = clusterByGap(enNumeros, rowGapY).filter((f) => f.items.length >= 3)
  if (previas.length < 2) return null
  const difs = []
  for (let i = 1; i < previas.length; i++) difs.push(previas[i].y - previas[i - 1].y)
  const gap = Math.max(rowGapY, 0.4 * medianOf(difs))
  const filas = clusterByGap(enNumeros, gap).filter((f) => f.items.length >= 3)
  if (filas.length < 2) return null
  // Control de cordura: todas las filas deben tener ~la misma cantidad de
  // numeros (una por columna) y no debe quedar ninguno suelto. Si dos filas se
  // pegaron (tabla larga e inclinada) o se partieron, este criterio no sirve y
  // se usa el agrupamiento clasico.
  const cuentas = filas.map((f) => f.items.length)
  const moda = cuentas.sort((a, b) => a - b)[Math.floor(cuentas.length / 2)]
  if (filas.some((f) => f.items.length > moda * 1.3)) return null
  if (filas.reduce((n, f) => n + f.items.length, 0) < enNumeros.length * 0.97) return null
  filas.forEach((f) => {
    const primero = f.items.reduce((m, it) => (it.xStart < m.xStart ? it : m), f.items[0])
    f.refY = primero.yRaw
  })
  const refs = filas.map((f) => f.refY).sort((a, b) => a - b)
  const sep = []
  for (let i = 1; i < refs.length; i++) sep.push(refs[i] - refs[i - 1])
  const espaciado = medianOf(sep)

  const sueltos = []
  const usados = new Set(filas.flatMap((f) => f.items))
  items.forEach((it) => {
    if (usados.has(it)) return
    const etiqueta = enEtiquetas(it)
    const y = etiqueta ? it.yRaw : it.y
    let mejor = null
    let dMin = Infinity
    filas.forEach((f) => {
      const d = Math.abs(y - (etiqueta ? f.refY : f.y))
      if (d < dMin) {
        dMin = d
        mejor = f
      }
    })
    if (mejor && dMin <= espaciado * (etiqueta ? 0.6 : 0.5)) {
      mejor.items.push(it)
      if (etiqueta && !esItemNivel(it)) mejor.nEtiquetas = (mejor.nEtiquetas || 0) + 1
    } else {
      sueltos.push({ ...it, y: etiqueta ? it.yRaw : it.y })
    }
  })
  // Una celda de descripcion escrita en VARIAS lineas deja 2+ lineas "cerca" de
  // la misma fila (y las filas altas de al lado se las pueden robar): ahi este
  // criterio por cercania no sirve y se usa el agrupamiento clasico, que junta
  // las lineas sin numeros y las pega a la fila con datos.
  if (filas.some((f) => f.nEtiquetas > 1)) return null
  const filasSueltas = clusterByGap(sueltos.sort((a, b) => a.y - b.y), rowGapY)
  return [...filas, ...filasSueltas].sort((a, b) => a.y - b.y)
}

// rowGapY=3.5 (el valor original) parte una sola fila visual en varias
// "micro-filas": en fotos reales los numeros de una misma fila no caen
// exactamente a la misma altura (inclinacion/ruido del OCR, mas notorio
// cuanto mas ancha es la tabla), y 3.5px es demasiado ajustado para esa
// diferencia. Se probo contra 7 tablas reales de GAMC (con encabezados y
// anchos bien distintos): 8px mejora las 7 sin romper ninguna.
// Si viene `lineYs` (limites de fila reales, detectados sobre la imagen ya
// enderezada por tableLineDetector.js) se arma cada fila por la banda de
// linea a la que cae cada bloque, en vez de por el gap fijo `rowGapY` -- mas
// preciso porque son las lineas de la tabla en si, no una heuristica ajustada
// a ojo. Si no hay suficientes lineas (<3, o sea menos de 2 bandas utiles) se
// sigue usando el gap de siempre, igual que antes de que existiera esto.
function buildGrid(blocks, { rowGapY = 8, mergeGapX = 18, columnGapX = 45, lineYs = [] } = {}) {
  let items = blocks
    .map((b) => ({
      text: (b.text || '').trim(),
      confidence: b.confidence ?? 1,
      y: yCenter(b.points),
      xStart: xStartOf(b.points),
      xEnd: xEndOf(b.points),
      h: Math.abs(b.points[2][1] - b.points[0][1]),
      yRaw: yCenter(b.points),
      // Y del borde izquierdo/derecho del bloque (el OCR lo devuelve inclinado).
      yIzq: (b.points[0][1] + b.points[3][1]) / 2,
      yDer: (b.points[1][1] + b.points[2][1]) / 2,
    }))
    .filter((b) => b.text)
  if (items.length === 0) return { columnCount: 0, rows: [] }

  // Los umbrales en px de abajo estan calibrados a fotos con texto de ~24px de
  // alto. Con imagenes bastante mas grandes o chicas (un PDF escaneado a 4000px,
  // por ej.) se escalan; dentro de 0.75x-1.5x se dejan tal cual.
  let escala = medianOf(items.map((it) => it.h).filter((h) => h > 0)) / 24 || 1
  if (escala >= 0.75 && escala <= 1.5) escala = 1
  escala = Math.min(3, Math.max(0.5, escala))
  rowGapY *= escala
  mergeGapX *= escala
  columnGapX *= escala

  items = items.flatMap(separarPrefijoNivel)

  // Corrige la inclinacion residual ANTES de agrupar por fila (ver
  // `estimateRowSlope`) -- afecta solo el Y usado para agrupar, no toca X
  // (la deteccion de columnas, mas abajo, sigue igual).
  // Ojo: probar una pendiente calculada solo con numeros empeoro tablas largas
  // (ESTA_SIII): se mantiene la de todos los items; las etiquetas, en cambio, se
  // cuelgan por su Y ORIGINAL en `agruparFilasPorNumeros`.
  const xCenterOf = (it) => (it.xStart + it.xEnd) / 2
  const conPendiente = (slope) => {
    if (!slope) return items.map((it) => ({ ...it }))
    const xRef = items.reduce((sum, it) => sum + xCenterOf(it), 0) / items.length
    return items.map((it) => ({ ...it, y: it.y - slope * (xCenterOf(it) - xRef) }))
  }
  const pendienteClasica = estimateRowSlope(items, columnGapX)
  const itemsClasico = conPendiente(pendienteClasica)
  itemsClasico.sort((a, b) => a.y - b.y)
  items = itemsClasico

  let rows = []
  if (lineYs.length >= 3) {
    const alturas = []
    for (let i = 0; i < lineYs.length - 1; i++) alturas.push(lineYs[i + 1] - lineYs[i])
    const ordenadas = [...alturas].sort((a, b) => a - b)
    const mid = Math.floor(ordenadas.length / 2)
    const alturaTipica = ordenadas.length % 2 ? ordenadas[mid] : (ordenadas[mid - 1] + ordenadas[mid]) / 2

    const bandas = lineYs.slice(0, -1).map(() => [])
    const bandaDe = (y) => {
      let i = 0
      while (i < lineYs.length - 2 && y >= lineYs[i + 1]) i++
      return i
    }
    items.forEach((it) => bandas[bandaDe(it.y)].push(it))

    bandas.forEach((bandaItems, i) => {
      if (bandaItems.length === 0) return
      if (alturas[i] > alturaTipica * 1.6) {
        rows.push(...clusterByGap([...bandaItems].sort((a, b) => a.y - b.y), rowGapY))
      } else {
        const y = bandaItems.reduce((sum, it) => sum + it.y, 0) / bandaItems.length
        rows.push({ y, lastY: y, items: bandaItems })
      }
    })
  } else {
    const porNumeros = agruparFilasPorNumeros(
      conPendiente(pendienteClasica).sort((a, b) => a.y - b.y),
      rowGapY,
    )
    rows = porNumeros || clusterByGap(items, rowGapY)
  }

  rows.forEach((row) => {
    row.items.sort((a, b) => a.xStart - b.xStart)
    const merged = []
    row.items.forEach((it) => {
      const prev = merged[merged.length - 1]
      if (prev && it.xStart - prev.xEnd < mergeGapX && !esItemNivel(prev) && !esItemNivel(it)) {
        prev.text = `${prev.text} ${it.text}`.trim()
        prev.xEnd = Math.max(prev.xEnd, it.xEnd)
        prev.confidence = Math.min(prev.confidence, it.confidence)
      } else {
        merged.push({ ...it })
      }
    })
    row.items = merged
  })

  // Los anclajes de columna se arman por el CENTRO del texto, no por el borde
  // izquierdo: en documentos reales el encabezado suele ir centrado en la
  // columna ("AMBIENTES", corto) mientras el dato es mucho mas largo
  // ("Departamento PB-A") y arranca mucho mas a la izquierda -- alineando por
  // borde izquierdo esos dos terminan en columnas distintas y la columna de
  // ambiente sale siempre vacia en las filas de datos. El centro, en cambio,
  // es estable entre encabezado y dato (verificado contra OCR real: ~372px
  // en las 8 celdas de una columna "ambiente", con el borde izquierdo
  // variando entre 120 y 315).

  // Filas de DATOS = las que traen varios numeros (los encabezados y titulos
  // no). Solo ellas arman las columnas: un encabezado centrado sobre dos
  // columnas ("SUPERFICIE PRIVADA (m2)") crearia una columna falsa en medio.
  // Con menos de 2 filas de datos se usa todo, como siempre.
  const filasDatos = rows.filter((row) => row.items.filter((it) => esTokenNumerico(it.text)).length >= 3)
  const filasAncla = filasDatos.length >= 2 ? filasDatos : rows

  // Modo "etiquetas | numeros": se activa si hay filas de datos con numeros. La
  // zona a la izquierda del primer numero (borde izquierdo) es de etiquetas.
  let numLeft = Infinity
  if (filasDatos.length >= 2) {
    filasDatos.forEach((row) =>
      row.items.forEach((it) => {
        if (esTokenNumerico(it.text)) numLeft = Math.min(numLeft, it.xStart)
      }),
    )
  }
  const modoEtiquetas = Number.isFinite(numLeft)
  const enZonaEtiquetas = (it) => modoEtiquetas && xCenterOf(it) < numLeft

  const allX = []
  filasAncla.forEach((row) =>
    row.items.forEach((it) => {
      if (!enZonaEtiquetas(it)) allX.push(xCenterOf(it))
    }),
  )
  allX.sort((a, b) => a - b)
  let anchors = []
  allX.forEach((x) => {
    if (anchors.length === 0 || x - anchors[anchors.length - 1] > columnGapX) anchors.push(x)
  })
  anchors = fusionarAnchorsFragmentados(anchors)

  // Columnas de etiquetas: [nivel?, descripcion] -- la de nivel solo si algun
  // texto de la zona parece un nivel ("NIVEL", "PLANTA BAJA", "PLANTA 2 PISO"...).
  let nivelIdx = -1
  let descIdx = -1
  if (modoEtiquetas) {
    const hayNivel = rows.some((row) => row.items.some((it) => enZonaEtiquetas(it) && esItemNivel(it)))
    if (hayNivel) nivelIdx = 0
    descIdx = hayNivel ? 1 : 0
    anchors = [...(hayNivel ? [-2] : []), -1, ...anchors]
  }

  rows.forEach((row) => {
    const aligned = anchors.map(() => ({ text: '', confidence: 1 }))
    row.items.forEach((it) => {
      const xCenter = xCenterOf(it)
      let closest
      if (enZonaEtiquetas(it)) {
        closest = nivelIdx >= 0 && esItemNivel(it) ? nivelIdx : descIdx
      } else {
        const primeraNum = modoEtiquetas ? descIdx + 1 : 0
        closest = Math.min(primeraNum, anchors.length - 1)
        let min = Math.abs(xCenter - anchors[closest])
        for (let i = closest + 1; i < anchors.length; i++) {
          const d = Math.abs(xCenter - anchors[i])
          if (d < min) {
            min = d
            closest = i
          }
        }
      }
      if (aligned[closest].text) {
        aligned[closest].text += ` ${it.text}`
        aligned[closest].confidence = Math.min(aligned[closest].confidence, it.confidence)
      } else {
        aligned[closest] = { text: it.text, confidence: it.confidence }
      }
    })
    row.cells = aligned
  })

  rows.sort((a, b) => a.y - b.y)
  return { columnCount: anchors.length, nivelIdx, rows: rows.map((r) => ({ cells: r.cells })) }
}

// ---------- 2.

// Quita acentos, pasa a mayusculas y colapsa a letras/numeros/espacios.
function norm(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Reglas de rol.
const ROLE_RULES = [
  { role: 'planta_col', test: (s) => s.includes('NIVEL') || (s.includes('PLANTA') && !s.includes('SUP')) },
  { role: 'ambiente', test: (s) => s.includes('AMBIENTE') || s.includes('DESCRIP') },
  // Los "TOTAL" son formulas en la plantilla -> se omiten a proposito.
  { role: 'omitir', test: (s) => s.includes('PRIV') && s.includes('TOTAL') },
  { role: 'omitir', test: (s) => s.includes('CONSTR') && s.includes('TOTAL') },
  { role: 'sup_privada_construida', test: (s) => s.includes('PRIV') && s.includes('CONSTR') },
  { role: 'sup_privada_libre', test: (s) => s.includes('PRIV') && s.includes('LIBRE') },
  { role: 'sup_ideal', test: (s) => s.includes('IDEAL') },
  { role: 'sup_comun_construida', test: (s) => s.includes('COMUN') && s.includes('CONSTR') },
  { role: 'sup_comun_libre', test: (s) => s.includes('COMUN') && s.includes('LIBRE') },
]

function roleForHeaderText(text) {
  const s = norm(text)
  if (!s) return 'omitir'
  for (const r of ROLE_RULES) if (r.test(s)) return r.role
  return 'omitir'
}

// ---------- 3.

const hasLetters = (s) => /[A-Za-z]/.test(s || '')
const hasDigits = (s) => /\d/.test(s || '')

function isHeaderRow(row) {
  const filled = row.cells.filter((c) => c.text.trim())
  if (filled.length === 0) return false
  const wordy = filled.filter((c) => hasLetters(c.text) && !hasDigits(c.text.replace(/m2|m²/gi, '')))
  return wordy.length / filled.length >= 0.6
}

const rowTieneDigitos = (row) => row.cells.some((c) => hasDigits(c.text.replace(/m2|m²/gi, '')))

// "Ruido" institucional: sello/membrete de la Alcaldia superpuesto sobre la hoja (membrete, direccion, telefonos).
import { guessPlantaCanonica } from './plantasCatalog'

const NOISE_RE = [
  /GOBIERNO\s*AUTONOMO\s*MUNICIPAL/,
  /ALCALDIA/,
  /SECRETARIA\s*GENERAL/,
  /PLAZA\s*DE\s*ARMAS/,
  /CENTRAL\s*PILOTO/,
  /\bTELF\b/,
  /\bTEL\.?\s*\d/,
  /\bWWW\b/,
  /\bHTTP/,
]

function isNoiseRow(row) {
  const text = norm(row.cells.map((c) => c.text).join(' '))
  if (!text) return false
  return NOISE_RE.some((re) => re.test(text))
}

const HEADER_KEYWORDS_RE = /\bAMBIENTES?\b|\bNIVEL\b|\bSUPERFICIE\b[\s\S]*\b(PRIVADA|COMUN|IDEAL|CONSTRUIDA|LIBRE|TOTAL)\b/

function isRepeatedHeaderRow(row) {
  const filled = row.cells.filter((c) => c.text.trim())
  if (filled.length === 0) return false
  const texto = norm(filled.map((c) => c.text).join(' '))
  if (HEADER_KEYWORDS_RE.test(texto)) return true
  const subHeader = filled.filter((c) => /^(CONSTRUIDA|LIBRE)$/.test(norm(c.text))).length
  return subHeader >= 2
}

// ---------- 4.

const PLANTA_RE =
  /^(PLANTA\d*|PISO\d*|NIVEL|SEMI\s?SOTANO|SEMISOTANO|SOTANO|SUBSUELO|SUB\s?SUELO|MEZZANINE|ENTREPISO|CUBIERTA|AZOTEA|TERRAZA|PB)\b/

const TOTAL_RE = /^(SUP\.?\s*TOTAL|SUPERFICIE\s*TOTAL|TOTAL(ES)?|SUBTOTAL)\b/

const RESUMEN_RE = /(RESUMEN\s*GENERAL|CUADRO\s*GENERAL)/

// ---------- 5.

/**
 * @param {Array} blocks  bloques OCR de UNA pagina: { points, text, confidence }
 * @param {{ lineYs?: number[] }} [opts]  limites de fila reales (ver buildGrid)
 * @returns {{
 *   columnCount: number,
 *   columnRoles: string[],     // rol sugerido por columna
 *   rows: Array<{ id: string, planta: string, cells: Array<{text,confidence}> }>
 * }}
 */
export function parseSuperficiesPage(blocks, opts = {}) {
  const grid = buildGrid(blocks, { lineYs: opts.lineYs || [] })
  if (grid.columnCount === 0) return { columnCount: 0, columnRoles: [], rows: [], filaTotal: null }
  grid.rows = grid.rows.filter((row) => !isNoiseRow(row))

  // Filas de encabezado = las primeras consecutivas que parecen encabezado.
  let headerEnd = 0
  while (headerEnd < grid.rows.length && headerEnd < 4 && isHeaderRow(grid.rows[headerEnd])) {
    headerEnd++
  }
  let candidato = headerEnd
  while (candidato < grid.rows.length && candidato < 20 && !rowTieneDigitos(grid.rows[candidato])) candidato++
  if (grid.rows.slice(headerEnd, candidato).some(isRepeatedHeaderRow)) headerEnd = candidato

  // Texto de encabezado combinado por columna (junta el titulo de grupo "SUPERFICIE PRIVADA" con el sub "CONSTRUIDA/LIBRE").
  const headerText = Array.from({ length: grid.columnCount }, () => [])
  for (let r = 0; r < headerEnd; r++) {
    grid.rows[r].cells.forEach((c, i) => {
      if (c.text.trim()) headerText[i].push(c.text.trim())
    })
  }
  let columnRoles = headerText.map((parts) => roleForHeaderText(parts.join(' ')))
  // Columna de nivel detectada por el contenido (ver buildGrid), aunque el
  // encabezado no diga "NIVEL".
  if (grid.nivelIdx >= 0 && columnRoles[grid.nivelIdx] !== 'planta_col') {
    if (columnRoles[grid.nivelIdx] === 'omitir') columnRoles[grid.nivelIdx] = 'planta_col'
  }

  columnRoles = columnRoles.map((role, i) => {
    if (role !== 'omitir') return role
    const h = norm(headerText[i].join(' '))
    if (!/CONSTR|LIBRE/.test(h) || /TOTAL/.test(h)) return role
    let grupo = h.includes('PRIV') ? 'privada' : h.includes('COMUN') ? 'comun' : null
    if (!grupo) {
      for (let j = i - 1; j >= 0; j--) {
        if (columnRoles[j] === 'sup_privada_construida' || columnRoles[j] === 'sup_privada_libre') {
          grupo = 'privada'
          break
        }
        if (columnRoles[j] === 'sup_comun_construida' || columnRoles[j] === 'sup_comun_libre') {
          grupo = 'comun'
          break
        }
      }
    }
    if (!grupo) return role
    const sub = h.includes('LIBRE') ? 'libre' : 'construida'
    return `sup_${grupo}_${sub}`
  })

  if (!columnRoles.includes('ambiente')) {
    const idx = columnRoles.findIndex((r) => r !== 'planta_col')
    if (idx >= 0) columnRoles[idx] = 'ambiente'
  }

  const ambienteIdx = columnRoles.indexOf('ambiente')

  // Tercera pasada: FALLBACK POR POSICION.
  const SURFACE = new Set([
    'sup_privada_construida',
    'sup_privada_libre',
    'sup_ideal',
    'sup_comun_construida',
    'sup_comun_libre',
  ])
  const detectados = columnRoles.filter((r) => SURFACE.has(r)).length

  const dataRows = grid.rows.slice(headerEnd)
  const numericCols = []
  for (let i = 0; i < grid.columnCount; i++) {
    if (i === ambienteIdx || columnRoles[i] === 'planta_col') continue
    const vals = dataRows.map((r) => (r.cells[i]?.text || '').trim()).filter(Boolean)
    const nums = vals.filter((t) => /\d/.test(t)).length
    if (vals.length >= 2 && nums / vals.length >= 0.5) numericCols.push(i)
  }

  const rolesDeSuperficie = columnRoles.filter((r) => SURFACE.has(r))
  const hayRolRepetido = new Set(rolesDeSuperficie).size < rolesDeSuperficie.length
  // El orden de las columnas de superficie en estas tablas es siempre
  // privada (constr., libre), ideal, comun (constr., libre): si lo detectado por
  // texto no respeta ese orden, el encabezado se leyo mal.
  const ORDEN = ['sup_privada_construida', 'sup_privada_libre', 'sup_ideal', 'sup_comun_construida', 'sup_comun_libre']
  const ordenDetectado = columnRoles.filter((r) => SURFACE.has(r)).map((r) => ORDEN.indexOf(r))
  const ordenIncoherente = ordenDetectado.some((v, i) => i > 0 && v < ordenDetectado[i - 1])
  const deteccionIncoherente =
    hayRolRepetido || ordenIncoherente || (numericCols.length >= 7 && detectados < 5)

  if ((detectados < 3 || deteccionIncoherente) && numericCols.length >= 3) {
    const O = 'omitir'
    const [PC, PL, ID, CC, CL] = [
      'sup_privada_construida',
      'sup_privada_libre',
      'sup_ideal',
      'sup_comun_construida',
      'sup_comun_libre',
    ]
    const TPL = {
      3: [PC, PL, ID],
      4: [PC, PL, CC, CL],
      5: [PC, PL, ID, CC, CL],
      6: [PC, PL, O, ID, CC, CL],
      7: [PC, PL, O, ID, CC, CL, O],
      8: [PC, PL, O, ID, O, CC, CL, O],
    }
    const tpl =
      TPL[numericCols.length] ||
      numericCols.map((_, k, a) =>
        k === 0 ? PC : k === 1 ? PL : k === a.length - 1 ? O : k === a.length - 2 ? CL : k === a.length - 3 ? CC : ID,
      )
    numericCols.forEach((colI, k) => {
      columnRoles[colI] = tpl[k] || O
    })
  }

  const plantaColIdx = columnRoles.indexOf('planta_col')

  const surfaceIdxs = columnRoles
    .map((role, i) => (SURFACE.has(role) ? i : -1))
    .filter((i) => i >= 0)
  const rowTieneNumero = (cells) => surfaceIdxs.some((i) => hasDigits(cells[i]?.text || ''))

  for (let i = 1; i < grid.rows.length; i++) {
    const fila = grid.rows[i]
    const anterior = grid.rows[i - 1]
    const filaEsMarca = fila.cells.some((c) => TOTAL_RE.test(norm(c.text)) || RESUMEN_RE.test(norm(c.text)))
    const anteriorSinAmbientePropio = !(anterior.cells[ambienteIdx]?.text || '').trim()
    // Caso inverso: la etiqueta cae un poco MAS ARRIBA que sus numeros (fila de
    // totales de la tabla de GAMC con letra grande) -> los numeros quedan en la
    // fila de abajo, sin ambiente propio.
    // Solo es una fila PARTIDA si las dos mitades se complementan: si ambas traen
    // un valor en la misma columna son filas distintas (una fila de datos a la
    // que el OCR no le leyo el nombre no debe tragarse por la de TOTAL).
    const seSolapan = (a, b) =>
      a.cells.some((c, idx) => surfaceIdxs.includes(idx) && c.text.trim() && b.cells[idx]?.text.trim())
    const siguiente = grid.rows[i + 1]
    if (
      filaEsMarca &&
      !rowTieneNumero(fila.cells) &&
      siguiente &&
      rowTieneNumero(siguiente.cells) &&
      !(siguiente.cells[ambienteIdx]?.text || '').trim() &&
      !seSolapan(fila, siguiente)
    ) {
      fila.cells = fila.cells.map((c, idx) => (c.text ? c : siguiente.cells[idx] || c))
      siguiente.cells = siguiente.cells.map((c) => ({ ...c, text: '' }))
      continue
    }
    if (!filaEsMarca || !anteriorSinAmbientePropio || seSolapan(fila, anterior)) continue
    fila.cells = fila.cells.map((c, idx) => (c.text ? c : anterior.cells[idx] || c))
    anterior.cells = anterior.cells.map((c) => ({ ...c, text: '' }))
  }

  const CUBIERTA_RE = /\bCUBIERTA\b/i
  const PLANTA_OMITIDA = '\0omitida'

  const rows = []
  let plantaActual = ''
  let plantaActualRaw = ''
  let filaTotal = null
  let fragmentoPendiente = '' // texto de fila(s) sin numeros, a la espera de la fila con datos

  const flushFragmentoAFilaAnterior = () => {
    if (!fragmentoPendiente || rows.length === 0) {
      fragmentoPendiente = ''
      return
    }
    const last = rows[rows.length - 1]
    last.cells = last.cells.map((c, i) =>
      i === ambienteIdx ? { ...c, text: `${c.text} ${fragmentoPendiente}`.trim() } : c,
    )
    fragmentoPendiente = ''
  }

  for (let r = headerEnd; r < grid.rows.length; r++) {
    const cells = grid.rows[r].cells
    const primeraTxt = norm(cells[ambienteIdx >= 0 ? ambienteIdx : 0]?.text || '')
    const soloPrimera =
      cells.filter((c, i) => i !== ambienteIdx && c.text.trim()).length === 0

    if (cells.some((c) => RESUMEN_RE.test(norm(c.text)))) {
      // Bloque "RESUMEN GENERAL": se ignora el resto de la tabla.
      flushFragmentoAFilaAnterior()
      break
    }
    if (cells.some((c) => TOTAL_RE.test(norm(c.text)))) {
      flushFragmentoAFilaAnterior()
      filaTotal = { cells: cells.map((c) => ({ ...c })) }
      continue // fila de totales -> no se manda al Excel (ver `filaTotal`)
    }

    // Encabezado de una tabla siguiente (2da, 3ra...
    if (isRepeatedHeaderRow(grid.rows[r])) {
      flushFragmentoAFilaAnterior()
      continue
    }

    if (plantaColIdx >= 0) {
      const v = cells[plantaColIdx]?.text?.trim()
      if (v) {
        plantaActualRaw = v
        plantaActual = CUBIERTA_RE.test(v) ? PLANTA_OMITIDA : guessPlantaCanonica(v) || plantaActual
        // Celda fusionada con el nombre centrado (ver el relleno hacia atras
        // mas abajo): las filas anteriores sin planta son del mismo tramo, asi
        // que si es una planta omitida se van con ella.
        if (plantaActual === PLANTA_OMITIDA) {
          while (rows.length && !rows[rows.length - 1].planta) rows.pop()
        }
      }
    }

    // Layout A: fila que SOLO trae "PLANTA X PISO" (marca de seccion) -> fija la planta y no es una fila de datos.
    if (soloPrimera && PLANTA_RE.test(primeraTxt)) {
      plantaActualRaw = cells[ambienteIdx >= 0 ? ambienteIdx : 0].text.trim()
      plantaActual = CUBIERTA_RE.test(plantaActualRaw) ? PLANTA_OMITIDA : guessPlantaCanonica(plantaActualRaw) || plantaActual
      continue
    }

    const ambienteTxt = (cells[ambienteIdx >= 0 ? ambienteIdx : 0]?.text || '').trim()
    const tieneNumero = rowTieneNumero(cells)
    if (!ambienteTxt && !tieneNumero) continue // fila realmente vacia (sin texto ni numeros)

    if (plantaActual === PLANTA_OMITIDA) {
      fragmentoPendiente = ''
      continue
    }

    // Fila-fragmento: una celda de ambiente escrita en varias lineas (p.ej.
    if (!tieneNumero) {
      fragmentoPendiente = fragmentoPendiente ? `${fragmentoPendiente} ${ambienteTxt}` : ambienteTxt
      continue
    }

    const ambienteFinal = (fragmentoPendiente ? `${fragmentoPendiente} ${ambienteTxt}` : ambienteTxt).trim()
    fragmentoPendiente = ''

    rows.push({
      id: `f-${r}`,
      planta: plantaActual,
      plantaOcr: plantaActualRaw,
      bloque: '',
      cells: cells.map((c, i) => (i === ambienteIdx ? { ...c, text: ambienteFinal } : c)),
    })
  }
  flushFragmentoAFilaAnterior()

  for (let i = rows.length - 2; i >= 0; i--) {
    if (!rows[i].planta && rows[i + 1].planta) {
      rows[i].planta = rows[i + 1].planta
      rows[i].plantaOcr = rows[i + 1].plantaOcr
    }
  }

  return { columnCount: grid.columnCount, columnRoles, rows, filaTotal }
}

export const ROLES = [
  { key: 'omitir', label: 'Omitir' },
  { key: 'ambiente', label: 'Ambiente' },
  { key: 'sup_privada_construida', label: 'Priv. Construida' },
  { key: 'sup_privada_libre', label: 'Priv. Libre' },
  { key: 'sup_ideal', label: 'Ideal' },
  { key: 'sup_comun_construida', label: 'Común Construida' },
  { key: 'sup_comun_libre', label: 'Común Libre' },
  { key: 'planta_col', label: 'Planta (columna)' },
]

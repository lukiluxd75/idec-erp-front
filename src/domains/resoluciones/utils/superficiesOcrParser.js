/**
 * Reconstruye la tabla "RELACION DE SUPERFICIE" de una pagina a partir de los
 * bloques crudos del servicio OCR, y ademas:
 *   - detecta el ROL de cada columna por el texto del encabezado (con tolerancia
 *     a la deformacion tipica del OCR en fotos reales),
 *   - detecta la PLANTA (fila-seccion "PLANTA X PISO" o columna "NIVEL"),
 *   - descarta filas de totales ("SUP. TOTAL") y el bloque "RESUMEN GENERAL".
 *
 * La parte de agrupar por posicion es el port de `server/src/tableFromOcr.js`
 * (a su vez adaptado de `processAndFilterOCRData` del dominio geoextraccion del
 * proyecto-erp). Lo nuevo es la deteccion de encabezados/plantas.
 *
 * El usuario siempre puede corregir a mano lo que salga mal (los <select> de
 * rol vienen preseleccionados, no bloqueados).
 */

// ---------- 1. agrupamiento por posicion (port de tableFromOcr.js) ----------

const yCenter = (p) => (p[0][1] + p[2][1]) / 2
const xStartOf = (p) => Math.min(p[0][0], p[3][0])
const xEndOf = (p) => Math.max(p[1][0], p[2][0])

// Agrupa items (ya ordenados por y) en filas por gap fijo: arranca fila nueva
// cuando el salto en Y supera rowGapY. Es el heuristico de siempre, factorizado
// para reusarlo tambien como red de seguridad dentro de una banda de linea
// anormalmente alta (ver mas abajo).
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

// `tableLineDetector.js` SOLO corrige rotacion, no perspectiva (ver su
// docstring: buscar las 4 esquinas reales es fragil y puede perder columnas).
// Una foto real con el celular apenas inclinado respecto a la hoja deja un
// corrimiento vertical residual que CRECE con X dentro de cada fila -- no es
// ruido chico: probado contra una foto real de GAMC, la celda mas a la
// derecha de una fila cae hasta ~30-60px mas abajo que su propia celda de
// Ambiente, una diferencia comparable a la separacion ENTRE filas (~35-40px).
// Sin corregir esto, el agrupamiento por Y (banda de linea o gap, da igual)
// arranca sistematicamente desfasado una fila entera: el Ambiente de la fila
// N queda pegado a los numeros de la fila N-1 en TODA la tabla, no solo en
// alguna fila suelta.
//
// Se estima una unica pendiente global (px de Y por px de X) comparando el
// Y del i-esimo item de columnas NUMERICAS bien pobladas (incluye solo
// columnas con parecida cantidad de items, para no mezclar encabezado/totales
// con filas de datos) -- el orden DENTRO de una misma columna nunca se
// confunde por la inclinacion (siempre se compara al mismo X), asi que
// comparar la posicion del mismo indice entre dos columnas distintas da la
// pendiente real sin depender de que las filas ya esten bien armadas. La
// mediana de esas pendientes tolera el ruido de celdas sueltas del OCR.
// Se descarta (pendiente 0, sin corregir nada) si no hay muestras
// suficientes o si da una pendiente inverosimil (>11 grados aprox.: mas que
// eso ya es sospecha de columnas mal agrupadas, no inclinacion real).
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

// El comentario de mas abajo (donde se usan los anchors) explica por que se
// ancla por CENTRO del texto y no por borde izquierdo: encabezado corto vs
// dato largo. Pero el centro tampoco es perfecto -- probado contra una foto
// real de GAMC, el encabezado corto de una columna ("Construlda", ~90px de
// ancho) y sus propios numeros de dato ("17,21", ~55px de ancho) cayeron a
// solo ~45px de distancia en X, el mismo orden de magnitud que columnGapX
// -- alcanza para que el agrupador (que compara cada item SOLO contra el
// ULTIMO anchor aceptado, no contra el mas cercano) los separe en dos
// columnas. El resultado real fue mucho peor que una columna de mas: la
// columna con los NUMEROS quedaba sin encabezado propio (el texto "PRIV" +
// "CONSTR" cayo en la otra), asi que la deteccion de rol por texto nunca la
// reconocia como "Priv. Construida" y le asignaba cualquier otra cosa (se
// vio "Ideal" repetido en 3 columnas de la tabla real, cada una arrastrando
// el rol de la anterior por el fallback de texto/posicion) -- y la columna
// que SI tenia el encabezado quedaba vacia de datos. Mismo patron con la
// columna de "Ambiente" (nombre corto "Baulera1" vs largo "Parqueo
// Doble5+Baulera9").
//
// Fusiona anchors consecutivos cuyo hueco es chico COMPARADO CON LOS DEMAS
// huecos de columna de esta misma foto (no un pixel fijo -- el ancho de
// columna cambia mucho segun que tan cerca este el celular de la hoja). Se
// usa la mediana de los huecos reales como vara: un hueco de menos de la
// mitad de la mediana es "ruido de ancho de texto dentro de la misma
// columna", no una columna nueva. Sin lineas de columna reales para
// comparar (como si hay con `lineYs` para filas), es la mejor señal
// disponible.
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
  const items = blocks
    .map((b) => ({
      text: (b.text || '').trim(),
      confidence: b.confidence ?? 1,
      y: yCenter(b.points),
      xStart: xStartOf(b.points),
      xEnd: xEndOf(b.points),
    }))
    .filter((b) => b.text)

  // Corrige la inclinacion residual ANTES de agrupar por fila (ver
  // `estimateRowSlope`) -- afecta solo el Y usado para agrupar, no toca X
  // (la deteccion de columnas, mas abajo, sigue igual).
  const slope = estimateRowSlope(items, columnGapX)
  if (slope) {
    const xCenterOf = (it) => (it.xStart + it.xEnd) / 2
    const xRef = items.reduce((sum, it) => sum + xCenterOf(it), 0) / items.length
    items.forEach((it) => {
      it.y -= slope * (xCenterOf(it) - xRef)
    })
  }
  items.sort((a, b) => a.y - b.y)

  let rows = []
  if (lineYs.length >= 3) {
    const alturas = []
    for (let i = 0; i < lineYs.length - 1; i++) alturas.push(lineYs[i + 1] - lineYs[i])
    // Mediana real (promedia las 2 del medio si `alturas.length` es par) --
    // con `ordenadas[Math.floor(length/2)]` a secas, un caso comun de solo 2
    // bandas (una pagina de un piso con pocas filas reales) siempre devolvia
    // la banda MAS GRANDE como "tipica", volviendo imposible que superase su
    // propio umbral (1.6x) y dejando pasar bandas gigantes sin re-partir.
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

    // Una banda mucho mas alta que lo tipico (foto real con brillo/sombra que
    // borra 2-3 lineas seguidas -- visto probando contra fotos reales) puede
    // esconder VARIAS filas de datos, no una: en vez de confiar ciegamente en
    // que ahi "no hay mas lineas", se vuelve a partir esa banda con el gap
    // heuristico de siempre (red de seguridad).
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
    rows = clusterByGap(items, rowGapY)
  }

  rows.forEach((row) => {
    row.items.sort((a, b) => a.xStart - b.xStart)
    const merged = []
    row.items.forEach((it) => {
      const prev = merged[merged.length - 1]
      if (prev && it.xStart - prev.xEnd < mergeGapX) {
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
  const xCenterOf = (it) => (it.xStart + it.xEnd) / 2

  const allX = []
  rows.forEach((row) => row.items.forEach((it) => allX.push(xCenterOf(it))))
  allX.sort((a, b) => a - b)
  let anchors = []
  allX.forEach((x) => {
    if (anchors.length === 0 || x - anchors[anchors.length - 1] > columnGapX) anchors.push(x)
  })
  anchors = fusionarAnchorsFragmentados(anchors)

  rows.forEach((row) => {
    const aligned = anchors.map(() => ({ text: '', confidence: 1 }))
    row.items.forEach((it) => {
      const xCenter = xCenterOf(it)
      let closest = 0
      let min = Math.abs(xCenter - anchors[0])
      for (let i = 1; i < anchors.length; i++) {
        const d = Math.abs(xCenter - anchors[i])
        if (d < min) {
          min = d
          closest = i
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
  return { columnCount: anchors.length, rows: rows.map((r) => ({ cells: r.cells })) }
}

// ---------- 2. normalizacion de texto para matchear ----------

// Quita acentos, pasa a mayusculas y colapsa a letras/numeros/espacios. El OCR
// deforma bastante ("SUPEFICPANADA", "Coratruids") -> matcheamos por trozos.
function norm(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Reglas de rol. Se prueban en orden; la primera que matchea gana.
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
  // Fallback: si solo dice "CONSTRUIDA" / "LIBRE" (sub-encabezado suelto) no se
  // puede saber si es privada o comun -> queda "omitir" y lo asigna el usuario.
]

function roleForHeaderText(text) {
  const s = norm(text)
  if (!s) return 'omitir'
  for (const r of ROLE_RULES) if (r.test(s)) return r.role
  return 'omitir'
}

// ---------- 3. deteccion de filas de encabezado ----------

const hasLetters = (s) => /[A-Za-z]/.test(s || '')
const hasDigits = (s) => /\d/.test(s || '')

// Una fila es "de encabezado" si sus celdas con texto son mayormente palabras
// sin numeros (las filas de datos traen numeros de superficie).
function isHeaderRow(row) {
  const filled = row.cells.filter((c) => c.text.trim())
  if (filled.length === 0) return false
  const wordy = filled.filter((c) => hasLetters(c.text) && !hasDigits(c.text.replace(/m2|m²/gi, '')))
  return wordy.length / filled.length >= 0.6
}

// Ignora el digito de la unidad ("m2", "m²") -- si no, un encabezado como
// "SUPERFICIE PRIVADA (m2)" cuenta como si ya tuviera un numero de dato.
const rowTieneDigitos = (row) => row.cells.some((c) => hasDigits(c.text.replace(/m2|m²/gi, '')))

// "Ruido" institucional: sello/membrete de la Alcaldia superpuesto sobre la
// hoja (membrete, direccion, telefonos). El OCR lo lee como si fueran filas
// mas de la tabla; se descartan por patron antes de armar las filas de datos.
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

// Paginas reales de GAMC traen VARIAS tablitas "RELACION DE SUPERFICIE"
// apiladas en una misma foto (una por NIVEL/PLANTA), cada una con su propio
// encabezado repetido ("NIVEL | AMBIENTES | SUPERFICIE PRIVADA | ..."). El
// encabezado de la PRIMERA tabla ya lo saca `headerEnd` mas abajo; esto
// detecta esos MISMOS encabezados cuando se repiten mas adelante en la
// pagina (2da, 3ra tabla...) para descartarlos -- si no, se leen como filas
// sin numeros y el merge de celdas partidas (mas abajo) los pega sobre la
// fila de datos siguiente, arruinando todo lo que viene despues.
//
// A proposito NO se reusa `isHeaderRow` (esa es "la mayoria de celdas son
// palabras sin numero", que TAMBIEN es cierto para un ambiente partido en
// varias lineas como "HALL + ASCENSOR + GRADA" -- hay que ser mas estricto
// y pedir vocabulario de encabezado real, no cualquier fila de puro texto.
const HEADER_KEYWORDS_RE = /\bAMBIENTES?\b|\bNIVEL\b|\bSUPERFICIE\b[\s\S]*\b(PRIVADA|COMUN|IDEAL|CONSTRUIDA|LIBRE|TOTAL)\b/

function isRepeatedHeaderRow(row) {
  const filled = row.cells.filter((c) => c.text.trim())
  if (filled.length === 0) return false
  const texto = norm(filled.map((c) => c.text).join(' '))
  if (HEADER_KEYWORDS_RE.test(texto)) return true
  // sub-encabezado "Construida | Libre | Construida | Libre": ninguna fila de
  // ambiente real repite esas dos palabras sueltas en mas de una celda.
  const subHeader = filled.filter((c) => /^(CONSTRUIDA|LIBRE)$/.test(norm(c.text))).length
  return subHeader >= 2
}

// ---------- 4. deteccion de plantas / totales ----------

// "PLANTA\d*"/"PISO\d*" (en vez de una palabra suelta): el OCR a veces pega el
// numero de piso sin espacio ("PLANTA5° PISO"), y un \b comun despues de
// "PLANTA" nunca matchea ahi (no hay limite de palabra entre letra y digito).
const PLANTA_RE =
  /^(PLANTA\d*|PISO\d*|NIVEL|SEMI\s?SOTANO|SEMISOTANO|SOTANO|SUBSUELO|SUB\s?SUELO|MEZZANINE|ENTREPISO|CUBIERTA|AZOTEA|TERRAZA|PB)\b/

const TOTAL_RE = /^(SUP\.?\s*TOTAL|SUPERFICIE\s*TOTAL|TOTAL(ES)?|SUBTOTAL)\b/

const RESUMEN_RE = /(RESUMEN\s*GENERAL|CUADRO\s*GENERAL)/

// ---------- 5. parser publico ----------

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
  // El encabezado real de GAMC suele venir partido en MUCHAS filas sueltas
  // (cada palabra/sub-titulo del grupo "SUPERFICIE PRIVADA / CONSTRUIDA /
  // LIBRE" cae en su propia banda de Y) -- si supera el limite de 4 de
  // arriba, el resto se leeria como filas de datos. Se mira hacia adelante
  // hasta la primera fila con un numero (ahi sí empieza a haber datos) y, si
  // en el medio aparece vocabulario real de encabezado en cualquier fila (no
  // hace falta que este en TODAS, porque el OCR las corta demasiado chico),
  // se da por hecho que todo ese tramo sigue siendo encabezado.
  let candidato = headerEnd
  while (candidato < grid.rows.length && candidato < 20 && !rowTieneDigitos(grid.rows[candidato])) candidato++
  if (grid.rows.slice(headerEnd, candidato).some(isRepeatedHeaderRow)) headerEnd = candidato

  // Texto de encabezado combinado por columna (junta el titulo de grupo
  // "SUPERFICIE PRIVADA" con el sub "CONSTRUIDA/LIBRE").
  const headerText = Array.from({ length: grid.columnCount }, () => [])
  for (let r = 0; r < headerEnd; r++) {
    grid.rows[r].cells.forEach((c, i) => {
      if (c.text.trim()) headerText[i].push(c.text.trim())
    })
  }
  let columnRoles = headerText.map((parts) => roleForHeaderText(parts.join(' ')))

  // Segunda pasada: columnas que quedaron "omitir" pero cuyo encabezado dice
  // "CONSTRUIDA" o "LIBRE" a secas (el titulo de grupo "SUPERFICIE PRIVADA /
  // COMUN" cae en la columna de al lado). Se deduce el grupo del vecino de la
  // izquierda ya clasificado, o del propio texto si menciona PRIV/COMUN.
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

  // Si no se detecto ninguna columna "ambiente", asumimos que es la 1a que no
  // es planta_col (siempre hay una columna de descripcion).
  if (!columnRoles.includes('ambiente')) {
    const idx = columnRoles.findIndex((r) => r !== 'planta_col')
    if (idx >= 0) columnRoles[idx] = 'ambiente'
  }

  const ambienteIdx = columnRoles.indexOf('ambiente')

  // Tercera pasada: FALLBACK POR POSICION. En fotos reales el encabezado sale
  // demasiado deformado y quedan casi todas las columnas en "omitir". Como en
  // estas tablas de GAMC el ORDEN de columnas es fijo, se asignan por posicion:
  //   [priv.construida, priv.libre, (total), ideal, comun.construida, comun.libre, (total)]
  // Solo se hace si la deteccion por texto encontro POCOS roles (<3), y siempre
  // se puede corregir a mano en la tabla.
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

  if (detectados < 3 && numericCols.length >= 3) {
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

  // Columnas de superficie (para detectar filas-fragmento: una celda de
  // ambiente escrita en varias lineas se agrupa por posicion en varias filas
  // "fantasma" que no traen ningun numero al lado).
  const surfaceIdxs = columnRoles
    .map((role, i) => (SURFACE.has(role) ? i : -1))
    .filter((i) => i >= 0)
  const rowTieneNumero = (cells) => surfaceIdxs.some((i) => hasDigits(cells[i]?.text || ''))

  // A veces "SUPERFICIE TOTAL"/"RESUMEN GENERAL" queda en su PROPIA fila, sin
  // sus numeros: por deriva del OCR el texto cae en una columna vecina (no la
  // de ambiente) y por eso el agrupamiento por Y la separa de la fila que
  // trae los valores. Sin fusionarlas antes de clasificar, el TOTAL_RE de mas
  // abajo nunca ve la fila de numeros (esta en la fila de al lado) y esos
  // numeros se cuelan como si fueran una fila de datos real.
  //
  // Se fusiona SOLO cuando la fila anterior no tiene su propio texto de
  // ambiente (ya es una fila "huerfana" de solo-numeros, el mismo patron que
  // arma `fragmentoPendiente` mas abajo) -- si la anterior es una fila real
  // con su ambiente propio (p.ej. "Departamento C"), no se toca: la marca de
  // TOTAL aislada simplemente se descarta sola, sin numeros, mas abajo.
  for (let i = 1; i < grid.rows.length; i++) {
    const fila = grid.rows[i]
    const anterior = grid.rows[i - 1]
    // No exige que `fila` este sin numeros propios: a veces el reparto de
    // linea corta la fila de TOTAL justo por el medio y cada mitad se queda
    // con ALGUNOS de sus valores (ni la de arriba ni la de abajo quedan en
    // cero) -- alcanza con que sea reconocible como marca de TOTAL/RESUMEN.
    const filaEsMarca = fila.cells.some((c) => TOTAL_RE.test(norm(c.text)) || RESUMEN_RE.test(norm(c.text)))
    const anteriorSinAmbientePropio = !(anterior.cells[ambienteIdx]?.text || '').trim()
    if (!filaEsMarca || !anteriorSinAmbientePropio) continue
    fila.cells = fila.cells.map((c, idx) => (c.text ? c : anterior.cells[idx] || c))
    anterior.cells = anterior.cells.map((c) => ({ ...c, text: '' }))
  }

  const rows = []
  let plantaActual = ''
  // Fila "SUPERFICIE TOTAL" de la tabla: no se manda al Excel (son formulas
  // que la plantilla ya calcula solas), pero se guarda aparte para mostrarla
  // de referencia en la web (comparar a ojo contra el papel).
  let filaTotal = null
  let fragmentoPendiente = '' // texto de fila(s) sin numeros, a la espera de la fila con datos

  // Pega el fragmento pendiente (si hay) al ambiente de la ultima fila ya
  // agregada, para no perderlo cuando no aparece ninguna fila de datos
  // despues (p.ej. si el fragmento es lo ultimo antes de un corte de seccion).
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

    // Se revisan TODAS las celdas de la fila (no solo la de "ambiente"): la
    // etiqueta "SUPERFICIE TOTAL"/"RESUMEN GENERAL" a veces cae, por deriva
    // del OCR, en una columna vecina (p.ej. la de Planta) en vez de la de
    // ambiente -- si solo se mirara esa columna, la fila de totales se
    // colaria como si fuera una fila de datos real (visto con una foto real:
    // "SHAFT+GRADA" en Ambiente + los numeros de la fila de TOTAL del piso).
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

    // Encabezado de una tabla siguiente (2da, 3ra... NIVEL/PLANTA en la misma
    // pagina): se descarta ANTES de tocar planta_col/fragmentos, porque si no
    // la palabra "NIVEL" del propio encabezado pisaria `plantaActual` via
    // Layout B de abajo.
    if (isRepeatedHeaderRow(grid.rows[r])) {
      flushFragmentoAFilaAnterior()
      continue
    }

    // Layout B: columna "NIVEL" con el nombre de la planta (celda fusionada ->
    // viene solo en la 1a fila del bloque; se arrastra hacia abajo).
    if (plantaColIdx >= 0) {
      const v = cells[plantaColIdx]?.text?.trim()
      if (v) plantaActual = v
    }

    // Layout A: fila que SOLO trae "PLANTA X PISO" (marca de seccion) -> fija la
    // planta y no es una fila de datos. A proposito NO se vacia el fragmento
    // pendiente acá: esta marca suele quedar centrada verticalmente en su
    // celda fusionada y caer POSICIONALMENTE en el medio de un ambiente
    // partido en varias lineas (ej. "HALL+ASCENSOR+" / "PLANTA BAJA" /
    // "+SALA COPROPIETARIOS") -- si se vaciara acá se cortaria ese ambiente a
    // la mitad y el resto se pegaria sobre el ambiente siguiente, que no
    // tiene nada que ver.
    if (soloPrimera && PLANTA_RE.test(primeraTxt)) {
      plantaActual = cells[ambienteIdx >= 0 ? ambienteIdx : 0].text.trim()
      continue
    }

    const ambienteTxt = (cells[ambienteIdx >= 0 ? ambienteIdx : 0]?.text || '').trim()
    const tieneNumero = rowTieneNumero(cells)
    if (!ambienteTxt && !tieneNumero) continue // fila realmente vacia (sin texto ni numeros)

    // Fila-fragmento: una celda de ambiente escrita en varias lineas (p.ej.
    // "HALL + ASCENSOR + GRADA + SHAFT + BAÑOS H y M") se corta en varias filas
    // por posicion vertical. Si esta fila no trae NINGUN numero de superficie,
    // no es una fila de datos propia: se guarda su texto y se pega a la
    // proxima fila que si traiga numeros.
    if (!tieneNumero) {
      fragmentoPendiente = fragmentoPendiente ? `${fragmentoPendiente} ${ambienteTxt}` : ambienteTxt
      continue
    }

    // Esta fila SI trae numeros de superficie -- siempre se conserva como fila
    // de datos, aun si su propia celda de ambiente vino vacia (pasa cuando el
    // texto de una celda fusionada partida en varias lineas cae en una banda
    // distinta a la de sus propios numeros: sin este caso, la fila entera se
    // descartaba mas arriba por "fila vacia" y sus numeros se perdian sin
    // dejar rastro -- visto con una foto real, la superficie comun de un
    // "GRADA+ASCENSOR+..." desaparecia del todo).
    const ambienteFinal = (fragmentoPendiente ? `${fragmentoPendiente} ${ambienteTxt}` : ambienteTxt).trim()
    fragmentoPendiente = ''

    rows.push({
      id: `f-${r}`,
      planta: plantaActual,
      // "Bloque"/torre (columna B de Hoja2): la tabla de "RELACION DE
      // SUPERFICIE" no trae una marca propia para esto (a diferencia de
      // "PLANTA X PISO"), asi que arranca vacio y lo completa el usuario a
      // mano en la tabla, igual que corrige la Planta cuando hace falta.
      bloque: '',
      cells: cells.map((c, i) => (i === ambienteIdx ? { ...c, text: ambienteFinal } : c)),
    })
  }
  flushFragmentoAFilaAnterior()

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

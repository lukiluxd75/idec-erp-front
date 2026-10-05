
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
  const deteccionIncoherente = hayRolRepetido || (numericCols.length >= 7 && detectados < 5)

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
    if (!filaEsMarca || !anteriorSinAmbientePropio) continue
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

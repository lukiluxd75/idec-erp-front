// Limpieza posterior al parseo de la tabla de superficies: arregla lo que el OCR lee mal de forma
// sistematica (punto decimal perdido, ":" por ".", nombres pegados) y cruza cada fila con sus totales.

const TOLERANCIA = 0.021 // la propia tabla impresa a veces difiere en 0.01 por redondeo

// "2518" -> "25.18", "000" -> "0.00", "46:18" -> "46.18", "1.234,56" -> "1234.56". Si no es un numero, queda igual.
export function limpiarNumero(texto) {
  const bruto = String(texto ?? '').trim()
  if (!bruto) return bruto
  const t = bruto.replace(/\s+/g, '').replace(/[Oo]/g, '0').replace(/[:;]/g, '.').replace(/^-+/, '')
  if (!/^[\d.,]+$/.test(t) || !/\d/.test(t)) return bruto
  const sep = Math.max(t.lastIndexOf('.'), t.lastIndexOf(','))
  if (sep === -1) {
    if (t.length <= 2) return `${parseInt(t, 10)}.00`
    return `${t.slice(0, -2).replace(/^0+(?=\d)/, '')}.${t.slice(-2)}`
  }
  const entero = t.slice(0, sep).replace(/[.,]/g, '').replace(/^0+(?=\d)/, '') || '0'
  const decimal = t.slice(sep + 1).replace(/[.,]/g, '')
  if (decimal.length === 0) return `${entero}.00`
  return `${entero}.${decimal.length === 1 ? `${decimal}0` : decimal}`
}

const valor = (cell) => {
  const t = cell?.text
  if (t == null || !/^\d+\.\d+$/.test(String(t))) return null
  return parseFloat(t)
}
const confianza = (cell) => (cell && cell.confidence != null ? cell.confidence : 1)

function fijar(cell, n) {
  if (!cell || n == null || n < 0) return
  cell.ocrOriginal = cell.ocrOriginal ?? cell.text
  cell.text = n.toFixed(2)
}

// Relaciones de cada fila, sobre [c, l, t1, cc, cl, g]:  t1 = c + l  y  g = t1 + cc + cl.
const ECUACIONES = [
  [-1, -1, 1, 0, 0, 0],
  [0, 0, -1, -1, -1, 1],
]
const NOMBRES = ['c', 'l', 't1', 'cc', 'cl', 'g']
// Columnas donde un valor distinto de cero es lo menos esperable (casi siempre 0.00).
const SUELEN_SER_CERO = new Set(['l', 'cc', 'cl'])

// Busca el menor conjunto de celdas (maximo 2, mas las ilegibles) que, cambiadas, hace cuadrar las dos
// ecuaciones; entre varias soluciones gana la que toca celdas de menor confianza.
function conciliarFila(cells, idx) {
  const col = NOMBRES.map((n) => idx[n])
  if (col.some((i) => i < 0)) return
  const lectura = col.map((i) => valor(cells[i]))
  const conf = col.map((i) => confianza(cells[i]))
  const forzadas = lectura.map((x, k) => (x == null ? k : -1)).filter((k) => k >= 0)
  if (forzadas.length > 2) return

  const residuo = (eq, vals) => eq.reduce((acc, coef, k) => acc + coef * vals[k], 0)
  const cuadra = (vals) => ECUACIONES.every((eq) => Math.abs(residuo(eq, vals)) <= TOLERANCIA)
  const base = lectura.map((x) => x ?? 0)
  if (forzadas.length === 0 && cuadra(base)) return

  const candidatos = []
  const evaluar = (conjunto) => {
    const tocadas = new Set([...forzadas, ...conjunto])
    if (tocadas.size > 2) return
    const lista = [...tocadas]
    let nuevos
    if (lista.length === 1) {
      const [k] = lista
      const eq = ECUACIONES.find((e) => e[k] !== 0)
      nuevos = [-(residuo(eq, base) - eq[k] * base[k]) / eq[k]]
    } else {
      const [a, b] = lista
      const [e1, e2] = ECUACIONES
      const det = e1[a] * e2[b] - e1[b] * e2[a]
      if (Math.abs(det) < 1e-9) return
      const r1 = -(residuo(e1, base) - e1[a] * base[a] - e1[b] * base[b])
      const r2 = -(residuo(e2, base) - e2[a] * base[a] - e2[b] * base[b])
      nuevos = [(r1 * e2[b] - e1[b] * r2) / det, (e1[a] * r2 - r1 * e2[a]) / det]
    }
    const vals = [...base]
    lista.forEach((k, n) => (vals[k] = Math.round(nuevos[n] * 100) / 100))
    if (lista.some((k) => vals[k] < -TOLERANCIA) || !cuadra(vals)) return
    const sesgoCero = (k, antes, despues) => {
      if (!SUELEN_SER_CERO.has(NOMBRES[k])) return 0
      if (antes != null && antes < 0.005 && despues > 0.005) return 0.4
      if (antes != null && antes > 0.005 && despues < 0.005) return -0.5
      return 0
    }
    const costo = lista.reduce(
      (acc, k) => acc + 10 + (lectura[k] == null ? 0 : conf[k]) + sesgoCero(k, lectura[k], vals[k]),
      0,
    )
    candidatos.push({ costo, lista, vals })
  }
  for (let k = 0; k < 6; k++) evaluar([k])
  for (let k = 0; k < 6; k++) for (let m = k + 1; m < 6; m++) evaluar([k, m])
  if (candidatos.length === 0) return

  candidatos.sort((x, y) => x.costo - y.costo)
  const mejor = candidatos[0]
  // Empate real entre dos soluciones: no se adivina.
  if (candidatos[1] && Math.abs(candidatos[1].costo - mejor.costo) < 0.02) return
  mejor.lista.forEach((k) => fijar(cells[col[k]], Math.max(0, mejor.vals[k])))
}

function distancia(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

// Unidades con numero o letra detras ("LOCAL 5", "OFICINA A") y palabras sueltas.
const UNIDADES_NUMERO = ['LOCAL', 'TIENDA', 'DEPOSITO', 'PARQUEO', 'BAULERA']
const UNIDADES_LETRA = ['OFICINA', 'DEPARTAMENTO', 'DUPLEX']
const PALABRAS = ['MONOAMBIENTE', 'PASILLO', 'CIRCULACION', 'ASCENSOR', 'SUPERFICIE', 'MOTOCICLETA']
const COMO_DIGITO = { S: '5', B: '8', O: '0', I: '1', L: '1', Z: '2', G: '6' }
const COMO_LETRA = { 8: 'B', 0: 'D' }

const tolerancia = (w) => (w.length >= 10 ? 3 : w.length >= 6 ? 2 : 1)

function corregirToken(token) {
  if (token.includes(' ')) return token.split(' ').map(corregirToken).join(' ')
  if (!/^[A-Z0-9]+$/.test(token) || token.length < 4) return token
  let mejor = null
  const probar = (palabra, conSufijo, esNumero, soloDigito = false) => {
    for (const tl of [palabra.length - 1, palabra.length, palabra.length + 1]) {
      if (tl < 3 || tl > token.length) continue
      const cola = token.slice(tl)
      if (soloDigito ? !/^\d?$/.test(cola) : conSufijo ? cola.length > (esNumero ? 2 : 1) : cola.length > 0) continue
      if (conSufijo && !esNumero && !soloDigito && cola === 'S' && token.length === palabra.length + 1) continue // plural
      const dist = distancia(token.slice(0, tl), palabra)
      if (dist > tolerancia(palabra)) continue
      if (!mejor || dist < mejor.dist) mejor = { dist, palabra, cola, esNumero, conSufijo }
    }
  }
  UNIDADES_NUMERO.forEach((w) => probar(w, true, true))
  UNIDADES_LETRA.forEach((w) => probar(w, true, false))
  PALABRAS.forEach((w) => probar(w, true, true, true))
  if (!mejor) return token
  const { palabra, cola, esNumero, conSufijo } = mejor
  if (!conSufijo || !cola) return palabra
  let sufijo = cola
  if (esNumero && UNIDADES_NUMERO.includes(palabra)) sufijo = [...cola].map((ch) => COMO_DIGITO[ch] || ch).join('')
  else if (cola.length === 1) sufijo = COMO_LETRA[cola] || cola
  return `${palabra} ${sufijo}`
}

// "PARQUEOMOTOCICLETA2" -> "PARQUEO MOTOCICLETA2": dos palabras conocidas pegadas por el OCR.
function separarPegadas(token) {
  const conocidas = [...UNIDADES_NUMERO, ...UNIDADES_LETRA, ...PALABRAS]
  for (const w of conocidas) {
    if (token.length > w.length + 3 && token.startsWith(w)) {
      const resto = token.slice(w.length)
      if (conocidas.some((o) => resto.startsWith(o))) return `${w} ${resto}`
    }
  }
  return token
}

export function limpiarAmbiente(texto) {
  const t = String(texto ?? '')
  if (!t.trim()) return t
  return t
    .split(/(\s+|\+)/)
    .map((parte) => {
      const mayus = parte.toUpperCase()
      const nuevo = corregirToken(separarPegadas(mayus))
      return nuevo === mayus ? parte : nuevo
    })
    .join('')
}

const ROLES_NUMERICOS = new Set([
  'sup_privada_construida',
  'sup_privada_libre',
  'sup_ideal',
  'sup_comun_construida',
  'sup_comun_libre',
])

// "LOCAL 3, LOCAL 5(mal leido), LOCAL 5": un numero que no sube respecto del anterior y deja hueco antes del
// siguiente es el que falta en la secuencia.
function corregirSecuencia(rows, ambienteIdx) {
  if (ambienteIdx < 0) return
  const partir = (row) => /^(LOCAL|TIENDA|DEPOSITO|PARQUEO|BAULERA) (\d+)$/.exec(row.cells[ambienteIdx]?.text || '')
  rows.forEach((row, i) => {
    const m = partir(row)
    if (!m || i === 0) return
    const ant = partir(rows[i - 1])
    const sig = rows.slice(i + 1).map(partir).find(Boolean)
    if (!ant || ant[1] !== m[1] || !sig || sig[1] !== m[1]) return
    const [previo, actual, siguiente] = [+ant[2], +m[2], +sig[2]]
    if ((actual <= previo || actual >= siguiente) && siguiente > previo + 1) {
      const cell = row.cells[ambienteIdx]
      cell.ocrOriginal = cell.ocrOriginal ?? cell.text
      cell.text = `${m[1]} ${previo + 1}`
    }
  })
}

/**
 * Pisos tipo repiten unidades identicas ("DEPARTAMENTO B" con la misma superficie ideal en 4 pisos): si una
 * fila difiere de la mayoria (>= 2 coincidentes) en un valor poco confiable, se alinea con la mayoria.
 */
export function votarEntrePisos(paginas) {
  const filas = paginas.flatMap((pg) => {
    const rolIdx = (r) => pg.columnRoles.indexOf(r)
    const sig = (i) => (i >= 0 && pg.columnRoles[i + 1] === 'omitir' ? i + 1 : -1)
    const cols = [
      rolIdx('sup_privada_construida'),
      rolIdx('sup_privada_libre'),
      sig(rolIdx('sup_privada_libre')),
      rolIdx('sup_comun_construida'),
      rolIdx('sup_comun_libre'),
      sig(rolIdx('sup_comun_libre')),
    ]
    const ai = rolIdx('ambiente')
    const ii = rolIdx('sup_ideal')
    if (ai < 0 || ii < 0 || cols.some((i) => i < 0)) return []
    return pg.rows.map((row) => ({ row, cols: Object.assign(cols, { ideal: ii }), clave: `${(row.cells[ai]?.text || '').trim()}|${row.cells[ii]?.text}` }))
  })
  const grupos = new Map()
  filas.forEach((f) => {
    const ideal = parseFloat(f.row.cells[f.cols.ideal]?.text)
    if (ideal > 0 && !f.clave.startsWith('|')) grupos.set(f.clave, [...(grupos.get(f.clave) || []), f])
  })
  grupos.forEach((grupo) => {
    if (grupo.length < 3) return
    for (let k = 0; k < 6; k++) {
      const conteo = new Map()
      grupo.forEach((f) => {
        const t = f.row.cells[f.cols[k]]?.text
        if (valor({ text: t }) != null) conteo.set(t, (conteo.get(t) || 0) + 1)
      })
      const [ganador, votos] = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0] || []
      if (!ganador || votos < 2 || votos <= grupo.length / 2) continue
      grupo.forEach((f) => {
        const cell = f.row.cells[f.cols[k]]
        if (cell.text !== ganador && (confianza(cell) < 0.97 || (votos >= 3 && distancia(cell.text, ganador) === 1))) {
          cell.ocrOriginal = cell.ocrOriginal ?? cell.text
          cell.text = ganador
        }
      })
    }
  })
  return paginas
}

/** Devuelve la pagina parseada con numeros normalizados, nombres corregidos y filas cruzadas con sus totales. */
export function limpiarPagina(pagina) {
  const roles = pagina.columnRoles
  const rolIdx = (r) => roles.indexOf(r)
  const siguienteOmitir = (desde) => (desde >= 0 && roles[desde + 1] === 'omitir' ? desde + 1 : -1)
  const idx = {
    c: rolIdx('sup_privada_construida'),
    l: rolIdx('sup_privada_libre'),
    t1: siguienteOmitir(rolIdx('sup_privada_libre')),
    cc: rolIdx('sup_comun_construida'),
    cl: rolIdx('sup_comun_libre'),
    g: siguienteOmitir(rolIdx('sup_comun_libre')),
  }
  const ambienteIdx = rolIdx('ambiente')

  const limpiarCeldas = (cells) =>
    cells.map((cell, i) => {
      const numerica = ROLES_NUMERICOS.has(roles[i]) || i === idx.t1 || i === idx.g
      const nuevo = !cell.text
        ? cell.text
        : numerica
          ? limpiarNumero(cell.text)
          : i === ambienteIdx
            ? limpiarAmbiente(cell.text)
            : cell.text
      return nuevo === cell.text ? { ...cell } : { ...cell, text: nuevo, ocrOriginal: cell.text }
    })

  const rows = pagina.rows.map((row) => {
    const cells = limpiarCeldas(row.cells)
    conciliarFila(cells, idx)
    // Sin superficie privada (pasillos, circulaciones) la superficie ideal es 0.
    const total = idx.t1 >= 0 ? valor(cells[idx.t1]) : null
    const ideal = cells[rolIdx('sup_ideal')]
    if (total === 0 && ideal && valor(ideal) > 0) {
      ideal.ocrOriginal = ideal.ocrOriginal ?? ideal.text
      ideal.text = '0.00'
    }
    return { ...row, cells }
  })
  corregirSecuencia(rows, ambienteIdx)
  const filaTotal = pagina.filaTotal ? { ...pagina.filaTotal, cells: limpiarCeldas(pagina.filaTotal.cells) } : pagina.filaTotal
  return { ...pagina, rows, filaTotal }
}

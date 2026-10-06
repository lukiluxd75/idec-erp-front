import { rotatePoint } from './planNorthDetector'

export const LEYENDAS_COLINDANCIA = [
  'MURO DE CONTENCION',
  'AREA COMUN',
  'VACIO',
  'ESPACIO EXTERIOR',
  'AREA DE CIRCULACION VEHICULAR',
  'VECINO',
  'CALLE',
  'LOTE Nº',
  'R.M.',
]

function normTexto(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/([A-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

function blockCenter(b) {
  const xs = b.points.map((p) => p[0])
  const ys = b.points.map((p) => p[1])
  return { x: xs.reduce((a, v) => a + v, 0) / 4, y: ys.reduce((a, v) => a + v, 0) / 4 }
}

function radioAgrupado(cols, rows) {
  return Math.max(40, Math.round(Math.min(cols, rows) * 0.05))
}

function limpiarMedidas(s) {
  return (s || '')
    .replace(/\d+\s*=\s*\d+\s*%?/g, ' ')
    .replace(/\d+\s*%/g, ' ')
    .replace(/\d+(?:[.,:]\d+)+\s*(?:m\s*2|m²|mts?\b|m\b)?/gi, ' ')
    .replace(/\bm\s*2\b|m²/gi, ' ')
}

function tokensBloque(b) {
  return normTexto(limpiarMedidas(b.text)).split(' ').filter(Boolean)
}

const esNumero = (t) => /^\d+$/.test(t)

// ¿A lo sumo 1 letra de diferencia?
function aLoSumoUnCambio(a, b) {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let cambios = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++cambios > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else {
      i++
      j++
    }
  }
  return cambios + (a.length - i) + (b.length - j) <= 1
}

/** Palabra del nombre vs. */
function mismaPalabra(esperada, leida) {
  if (esNumero(esperada) || esNumero(leida)) {
    return esNumero(esperada) && esNumero(leida) && Number(esperada) === Number(leida)
  }
  if (esperada === leida) return true
  if (esperada.length >= 5 && aLoSumoUnCambio(esperada, leida)) return true
  return esperada.length >= 8 && (leida.startsWith(esperada) || leida.endsWith(esperada))
}

// Letras que el OCR confunde con dígitos cuando van pegadas al final de una palabra ("ELECTRICOS" por "ELECTRICO 5").
const LETRA_COMO_DIGITO = { O: '0', D: '0', Q: '0', I: '1', L: '1', Z: '2', S: '5', G: '6', B: '8' }

/** ¿Aparece la secuencia `clave` (palabras seguidas, p.ej. */
function contieneSecuencia(tokens, clave) {
  // "ELECTRICOS" = "ELECTRICO" + "5": palabra exacta + letra-dígito pegada.
  if (clave.length === 2 && esNumero(clave[1])) {
    const pegado = tokens.some((t) => {
      const digito = LETRA_COMO_DIGITO[t.slice(-1)]
      return digito && Number(digito) === Number(clave[1]) && t.slice(0, -1) === clave[0]
    })
    if (pegado) return true
  }
  for (let i = 0; i < tokens.length; i++) {
    let k = 0
    let j = i
    while (k < clave.length && j < tokens.length && mismaPalabra(clave[k], tokens[j])) {
      k++
      j++
    }
    if (k === clave.length) return true
  }
  return false
}

function claveDe(tokens) {
  const iNum = tokens.findIndex((t, i) => i > 0 && esNumero(t))
  if (iNum > 0) return { desde: iNum - 1, palabras: tokens.slice(iNum - 1, iNum + 1) }
  if (tokens.some((t) => t.length === 1)) return { desde: 0, palabras: tokens }
  return { desde: 0, palabras: tokens.slice(0, 1) }
}

function buscarCompuestoDetalle(bloques, frase, radio) {
  // Sin palabras cortas ("Y", "DE") que calzan con cualquier cosa.
  const tokens = [...new Set(normTexto(frase).split(' ').filter((t) => t.length >= 3))]
  if (tokens.length === 0) return { pos: null, motivo: 'nombre vacío' }
  const necesarias = Math.max(2, Math.ceil(tokens.length / 2))
  if (tokens.length < necesarias) return { pos: null, tokens, motivo: 'nombre compuesto demasiado corto' }

  const conTokens = bloques.map((b) => ({ b, t: tokensBloque(b), c: blockCenter(b) }))
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y)
  const calza = (palabra, t) =>
    mismaPalabra(palabra, t) ||
    (palabra.length >= 4 && t.includes(palabra)) ||
    (t.length >= 3 && t.length >= palabra.length - 2 && palabra.startsWith(t) && !esNumero(t))
  const tiene = (x, palabra) => x.t.some((t) => calza(palabra, t))
  const anclas = conTokens.filter((x) => tokens.some((p) => tiene(x, p)))
  if (anclas.length === 0) {
    return { pos: null, tokens, motivo: `ninguna palabra de "${tokens.join(' ')}" aparece en el OCR` }
  }

  let mejor = null
  for (const ancla of anclas) {
    const cercanos = conTokens.filter((x) => dist(x.c, ancla.c) <= radio)
    const usados = [ancla]
    const encontradas = tokens.filter((p) => {
      if (usados.some((u) => tiene(u, p))) return true
      const otro = cercanos.filter((x) => tiene(x, p)).sort((a, b) => dist(a.c, ancla.c) - dist(b.c, ancla.c))[0]
      if (otro) usados.push(otro)
      return Boolean(otro)
    })
    const puntaje = encontradas.length
    if (!mejor || puntaje > mejor.puntaje || (puntaje === mejor.puntaje && usados.length < mejor.usados.length)) {
      mejor = { puntaje, usados, encontradas }
    }
  }
  const faltantes = tokens.filter((p) => !mejor.encontradas.includes(p))
  if (mejor.puntaje < necesarias) {
    return {
      pos: null,
      tokens,
      motivo:
        `de "${tokens.join(' ')}" solo aparecen juntas ${mejor.puntaje} palabra(s) ` +
        `(${mejor.encontradas.join(', ') || '—'}), hacen falta ${necesarias}`,
      textoCerca: mejor.usados.map((u) => u.b.text),
    }
  }
  return {
    pos: {
      x: mejor.usados.reduce((a, u) => a + u.c.x, 0) / mejor.usados.length,
      y: mejor.usados.reduce((a, u) => a + u.c.y, 0) / mejor.usados.length,
    },
    tokens,
    bloques: mejor.usados.map((u) => u.b.text),
    coincidencias: anclas.length,
    ...(faltantes.length ? { palabrasQueNoEstan: faltantes } : {}),
  }
}

/** Busca dónde está escrita `frase` en el plano, juntando bloques de OCR cercanos entre sí. */
function buscarFraseDetalle(bloques, frase, radio) {
  if (frase.includes('+')) return buscarCompuestoDetalle(bloques, frase, radio)
  const tokens = normTexto(frase).split(' ').filter(Boolean)
  if (tokens.length === 0) return { pos: null, motivo: 'nombre vacío' }
  const { desde, palabras: clave } = claveDe(tokens)
  const resto = tokens.filter((_, i) => i < desde || i >= desde + clave.length)

  const conTokens = bloques.map((b) => ({ b, t: tokensBloque(b), c: blockCenter(b) }))
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y)

  const inicios = []
  conTokens.forEach((x) => {
    if (contieneSecuencia(x.t, clave)) inicios.push([x])
  })
  if (clave.length === 2 && esNumero(clave[1])) {
    conTokens.forEach((x) => {
      if (!x.t.length || !mismaPalabra(clave[0], x.t[x.t.length - 1])) return
      conTokens.forEach((y) => {
        if (y !== x && y.t.length === 1 && mismaPalabra(clave[1], y.t[0]) && dist(x.c, y.c) <= radio / 2) {
          inicios.push([x, y])
        }
      })
    })
  }
  if (inicios.length === 0) {
    return { pos: null, tokens, motivo: `ningún bloque del OCR tiene "${clave.join(' ')}"` }
  }

  const centro = (usados) => ({
    x: usados.reduce((a, u) => a + u.c.x, 0) / usados.length,
    y: usados.reduce((a, u) => a + u.c.y, 0) / usados.length,
  })

  let mejor = null
  let menosFaltantes = null
  for (const inicio of inicios) {
    const c0 = centro(inicio)
    const cercanos = conTokens.filter((x) => dist(x.c, c0) <= radio)
    const usados = [...inicio]
    const faltantes = []
    resto.forEach((palabra) => {
      if (usados.some((u) => u.t.some((t) => mismaPalabra(palabra, t)))) return
      const encontrado = cercanos
        .filter((x) => x.t.some((t) => mismaPalabra(palabra, t)))
        .sort((p, q) => dist(p.c, c0) - dist(q.c, c0))[0]
      if (encontrado) usados.push(encontrado)
      else faltantes.push(palabra)
    })
    if (faltantes.length > 0) {
      if (!menosFaltantes || faltantes.length < menosFaltantes.faltantes.length) {
        menosFaltantes = { faltantes, textoCerca: cercanos.map((x) => x.b.text) }
      }
      continue
    }
    // Centro de los bloques que forman el nombre (no de todo lo que hay cerca).
    const anexos = usados.filter((u) => u.b.text.trim().startsWith('+')).length
    const peor =
      mejor && (usados.length > mejor.usados.length || (usados.length === mejor.usados.length && anexos >= mejor.anexos))
    if (!peor) mejor = { usados, anexos, pos: centro(usados) }
  }
  if (mejor) {
    return {
      pos: mejor.pos,
      tokens,
      bloques: mejor.usados.map((u) => u.b.text),
      coincidencias: inicios.length,
    }
  }
  return {
    pos: null,
    tokens,
    motivo:
      `"${clave.join(' ')}" aparece en ${inicios.length} lugar(es), pero a menos de ${radio} px ` +
      `no están: ${menosFaltantes.faltantes.join(', ')}`,
    textoCerca: menosFaltantes.textoCerca,
  }
}

const RUIDO_ROTULO = new Set(['SUP', 'ESC', 'Y', 'DE', 'M', 'M2', 'N'])

const UMBRAL_CONFIANZA_ROTULO = 0.68

// ¿Los tokens de un bloque son (o contienen completa) una de las 7 leyendas fijas?
function esLeyenda(tokens) {
  return LEYENDAS_COLINDANCIA.some((leyenda) => {
    const tLeyenda = normTexto(leyenda).split(' ').filter(Boolean)
    return tLeyenda.every((t) => tokens.includes(t))
  })
}

export function autodetectarUnidades(bloquesOcr) {
  const vistos = new Set()
  const nombres = []
  bloquesOcr.forEach((b) => {
    if ((b.confidence ?? 1) < UMBRAL_CONFIANZA_ROTULO) return
    const tokens = tokensBloque(b)
    if (tokens.length === 0 || esLeyenda(tokens)) return
    if (tokens[0] === 'PLANTA') return // título de la planta, no una unidad
    const tieneAlgoUtil = tokens.some((t) => !esNumero(t) && t.length >= 4 && !RUIDO_ROTULO.has(t))
    if (!tieneAlgoUtil) return
    const nombre = tokens.join(' ')
    if (vistos.has(nombre)) return
    vistos.add(nombre)
    nombres.push(nombre)
  })
  const conNumero = nombres.filter((n) => /\d/.test(n))
  return nombres.filter((n) => /\d/.test(n) || !conNumero.some((c) => c.startsWith(`${n} `)))
}

function sectorDe(dx, dy) {
  let a = (Math.atan2(dy, dx) * 180) / Math.PI // 0=este, 90=sud, -90=norte, 180/-180=oeste
  if (a < 0) a += 360
  const s = Math.floor(((a + 45) % 360) / 90)
  return ['este', 'sud', 'oeste', 'norte'][s]
}

/**
 * @param {Array<{points:number[][],text:string}>} bloquesOcr   OCR de la pagina del plano de esta planta
 * @param {string[]} nombresUnidadesPlanta   "Ambiente" de todas las filas de Hoja2 con esta Planta (ya cargadas por el usuario)
 * @param {{angleDeg:number}} norte           salida de detectNorth() para esta misma imagen
 * @param {{width:number,height:number}} tamañoImagen
 * @returns {Record<string, {norte:string,este:string,sud:string,oeste:string}>}
 *   Sugerencias por unidad -- SOLO unidades para las que se encontró su
 *   etiqueta en el plano; el resto se deja para completar a mano.
 */
export function detectColindancias(bloquesOcr, nombresUnidadesPlanta, norte, tamañoImagen) {
  return analizarColindancias(bloquesOcr, nombresUnidadesPlanta, norte, tamañoImagen).sugerencias
}

const redondear = (v) => Math.round(v)

export function analizarColindancias(bloquesOcr, nombresUnidadesPlanta, norte, tamañoImagen) {
  const radio = radioAgrupado(tamañoImagen.width, tamañoImagen.height)
  const cx = tamañoImagen.width / 2
  const cy = tamañoImagen.height / 2
  const angleDeg = norte?.angleDeg || 0

  const aFrameNorte = (p) => rotatePoint(p.x, p.y, cx, cy, -angleDeg)

  const etiquetas = []
  const busquedas = []
  const ubicar = (tipo, valor) => {
    const d = buscarFraseDetalle(bloquesOcr, valor, radio)
    const registro = { tipo, valor, encontrada: Boolean(d.pos) }
    if (d.pos) {
      const enNorte = aFrameNorte(d.pos)
      etiquetas.push({ tipo, valor, ...enNorte })
      registro.posicionImagen = { x: redondear(d.pos.x), y: redondear(d.pos.y) }
      registro.posicionNorteArriba = { x: redondear(enNorte.x), y: redondear(enNorte.y) }
      registro.bloquesUsados = d.bloques
      if (d.coincidencias > 1) registro.coincidenciasDelPrimerToken = d.coincidencias
    } else {
      registro.motivo = d.motivo
      if (d.textoCerca) registro.textoCerca = d.textoCerca
    }
    busquedas.push(registro)
  }
  nombresUnidadesPlanta.forEach((nombre) => ubicar('unidad', nombre))
  LEYENDAS_COLINDANCIA.forEach((leyenda) => ubicar('leyenda', leyenda.trim()))

  const sugerencias = {}
  const detallePorUnidad = {}
  const unidadesUbicadas = etiquetas.filter((e) => e.tipo === 'unidad')

  unidadesUbicadas.forEach((origen) => {
    const porSector = { norte: [], este: [], sud: [], oeste: [] }
    etiquetas.forEach((destino) => {
      if (destino === origen) return
      const dx = destino.x - origen.x
      const dy = destino.y - origen.y
      porSector[sectorDe(dx, dy)].push({
        valor: destino.valor,
        tipo: destino.tipo,
        distancia: redondear(Math.hypot(dx, dy)),
        // Rumbo desde la unidad, con el norte arriba (0 = norte, 90 = este).
        rumboDeg: redondear(((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360),
      })
    })
    const sugerencia = {}
    const detalle = {}
    Object.entries(porSector).forEach(([lado, candidatos]) => {
      candidatos.sort((a, b) => a.distancia - b.distancia)
      sugerencia[lado] = candidatos[0]?.valor || 'ESPACIO EXTERIOR'
      detalle[lado] = {
        elegido: sugerencia[lado],
        porDefecto: candidatos.length === 0,
        candidatos: candidatos.slice(0, 5),
      }
    })
    sugerencias[origen.valor] = sugerencia
    detallePorUnidad[origen.valor] = detalle
  })

  return {
    sugerencias,
    detalle: {
      radioAgrupadoPx: radio,
      anguloNorteUsado: angleDeg,
      busquedas,
      unidadesSinUbicar: nombresUnidadesPlanta.filter((n) => !sugerencias[n]),
      porUnidad: detallePorUnidad,
    },
  }
}

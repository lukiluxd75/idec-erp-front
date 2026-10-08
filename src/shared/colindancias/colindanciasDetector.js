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
  // Rótulos de avenida/lote de los planos del formato 2 ("AV. CIRCUNVALACION
  // BEIJING DE 50.00 MTS.", "LOTE B"): igual que "CALLE", la primera palabra
  // alcanza para reconocerlos.
  'AV.',
  'AVENIDA',
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

// La tabla de superficies aclara a veces el nombre con un paréntesis que el
// plano NO escribe junto al rótulo ("DEPARTAMENTO DUPLEX A (PLANTA 11° PISO +
// PLANTA TERRAZA)" se rotula "DEPARTAMENTO DUPLEX A" y, aparte, en otra línea,
// "PLANTA 11° PISO + PLANTA TERRAZA"). Para ubicar la unidad se busca solo el
// nombre, sin el paréntesis (ni su "+", que la mandaría a la búsqueda de
// nombres compuestos).
function sinAclaracion(frase) {
  return (frase || '').replace(/\([^)]*\)?/g, ' ').replace(/\s+/g, ' ').trim()
}

// Alto del texto de un bloque: el lado corto de su caja (sirve también con
// rótulos girados 90°, donde el alto queda como ancho).
function altoLetra(b) {
  const xs = b.points.map((p) => p[0])
  const ys = b.points.map((p) => p[1])
  return Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
}

/**
 * Quita del OCR las LISTAS en columna: al borde de la foto de algunos planos
 * se cuela un pedazo de la tabla de superficies (una columna de nombres
 * "DEPARTAMENTO A / DEPARTAMENTO B / ..." con las mismas medidas que el
 * propio plano), y esos nombres se confundían con los rótulos de las unidades
 * y las "ubicaban" en el margen. Una lista es una pila de 5 o más bloques con
 * el borde izquierdo alineado y casi pegados entre sí (separados menos de dos
 * veces su alto); los rótulos del dibujo, aunque estén alineados, quedan
 * mucho más separados.
 */
export function quitarListasDeTabla(bloques) {
  const info = bloques.map((b, i) => {
    const xs = b.points.map((p) => p[0])
    return { i, x0: Math.min(...xs), cy: blockCenter(b).y, h: altoLetra(b) }
  })
  const quitar = new Set()
  const porX = [...info].sort((a, b) => a.x0 - b.x0)
  let grupo = []
  const cerrar = () => {
    const pila = [...grupo].sort((a, b) => a.cy - b.cy)
    let racha = [pila[0]]
    const cierraRacha = () => {
      if (racha.length >= 5) racha.forEach((r) => quitar.add(r.i))
    }
    for (let k = 1; k < pila.length; k++) {
      const alto = Math.max(pila[k].h, racha[racha.length - 1].h, 1)
      if (pila[k].cy - racha[racha.length - 1].cy <= 2 * alto) racha.push(pila[k])
      else {
        cierraRacha()
        racha = [pila[k]]
      }
    }
    cierraRacha()
  }
  porX.forEach((it) => {
    if (grupo.length && it.x0 - grupo[0].x0 > Math.max(8, 0.5 * it.h)) {
      cerrar()
      grupo = []
    }
    grupo.push(it)
  })
  if (grupo.length) cerrar()
  return quitar.size ? bloques.filter((_, i) => !quitar.has(i)) : bloques
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
  // Rótulos con letra suelta ("DEPARTAMENTO DUPLEX B", "MONOAMBIENTE R"): el OCR
  // suele pegarla a la palabra anterior ("DUPLEXB", "MONOAMBIENTER"). Se
  // compara el bloque entero sin espacios, nunca un pedazo: "DEPARTAMENTO D"
  // no puede calzar con el comienzo de "DEPARTAMENTO DUPLEX".
  if (clave.some((t) => t.length === 1) && tokens.length > 0) {
    return tokens.join('') === clave.join('')
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
function buscarFraseDetalle(bloques, fraseOriginal, radio) {
  const frase = sinAclaracion(fraseOriginal)
  if (frase.includes('+')) return buscarCompuestoDetalle(bloques, frase, radio)
  const tokens = normTexto(frase).split(' ').filter(Boolean)
  if (tokens.length === 0) return { pos: null, motivo: 'nombre vacío' }
  const { desde, palabras: clave } = claveDe(tokens)
  const resto = tokens.filter((_, i) => i < desde || i >= desde + clave.length)

  const conTokens = bloques.map((b) => ({ b, t: tokensBloque(b), c: blockCenter(b), letra: altoLetra(b) }))
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
  const candidatas = [] // todos los lugares donde el nombre quedo completo (puede haber mas de uno)
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
    candidatas.push({ pos: centro(usados), bloques: usados.map((u) => u.b.text) })
    // Centro de los bloques que forman el nombre (no de todo lo que hay cerca).
    const anexos = usados.filter((u) => u.b.text.trim().startsWith('+')).length
    // Alto medio del texto (lado corto de su caja): el rótulo del dibujo es
    // bastante más grande que el mismo nombre repetido en una tabla pequeña
    // que a veces queda al borde de la foto del plano.
    const letra = usados.reduce((a, u) => a + u.letra, 0) / usados.length
    const igual = mejor && usados.length === mejor.usados.length && anexos === mejor.anexos
    const peor =
      mejor &&
      (usados.length > mejor.usados.length ||
        (usados.length === mejor.usados.length && anexos > mejor.anexos) ||
        (igual && letra < mejor.letra * 1.25))
    if (!peor) mejor = { usados, anexos, letra, pos: centro(usados) }
  }
  if (mejor) {
    return {
      pos: mejor.pos,
      tokens,
      bloques: mejor.usados.map((u) => u.b.text),
      coincidencias: inicios.length,
      candidatas,
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
  quitarListasDeTabla(bloquesOcr).forEach((b) => {
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

// Distancia angular (grados) del rumbo al limite de sector mas cercano (45, 135, 225, 315).
const margenAlLimite = (rumbo) => Math.abs((((rumbo % 90) + 90) % 90) - 45)

const MARGEN_DUDOSO = 18

// Rumbo con el norte arriba (0 = norte, 90 = este) -> lado.
const ladoDeRumbo = (r) => ['norte', 'este', 'sud', 'oeste'][Math.floor((((r + 45) % 360) + 360) % 360 / 90)]

/**
 * Por que el relleno de un lado es dudoso (lo revisa el arquitecto a mano), o null si es confiable.
 * El detector decide por la posicion de los rotulos, no por los muros: es poco fiable cuando el
 * vecino cae cerca del limite entre dos lados, cuando hay dos candidatos parecidos o cuando una
 * de las unidades se ubico solo por su superficie.
 */
function motivoDeDuda(lado, candidatos, todos, origen, etiquetas) {
  if (origen.aprox) return origen.aprox
  const primero = candidatos[0]
  if (primero) {
    const vecino = etiquetas.find((e) => e.mostrar === primero.valor)
    if (vecino?.aprox) return `vecino dudoso: ${vecino.aprox}`
    if (vecino?.generica) return 'calle detectada por su ubicacion en el plano: confirmar el nombre'
    if (margenAlLimite(primero.rumboDeg) < MARGEN_DUDOSO) return 'el vecino cae casi en la diagonal entre dos lados'
    // Otra unidad, mas cerca, que cae en un lado vecino casi sobre la diagonal: pudo ser la verdadera de este lado.
    const mejorada = todos.find(
      (c) =>
        c.tipo === 'unidad' &&
        c.valor !== primero.valor &&
        ladoDeRumbo(c.rumboDeg) !== lado &&
        c.distancia < primero.distancia &&
        margenAlLimite(c.rumboDeg) < MARGEN_DUDOSO + 8,
    )
    if (mejorada) return `"${mejorada.valor}" esta mas cerca y casi en la diagonal de este lado`
    const segundo = candidatos.find((c) => c.valor !== primero.valor)
    if (segundo && segundo.distancia < primero.distancia * 1.4) return 'hay otro candidato casi igual de cerca'
    return null
  }
  // Sin candidato se sugiere ESPACIO EXTERIOR: es dudoso si hay una unidad casi en la diagonal de este lado.
  const cerca = todos.find((c) => margenAlLimite(c.rumboDeg) < MARGEN_DUDOSO + 8 && c.tipo === 'unidad')
  return cerca ? `"${cerca.valor}" queda casi en la diagonal de este lado` : null
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

function desambiguarPorSuperficie(candidatas, bloquesArea, radio) {
  if (!bloquesArea.length) return null
  const centros = bloquesArea.map(blockCenter)
  const puntuadas = candidatas
    .map((c) => ({ c, d: Math.min(...centros.map((p) => Math.hypot(p.x - c.pos.x, p.y - c.pos.y))) }))
    .sort((a, b) => a.d - b.d)
  if (puntuadas[0].d > radio * 3) return null
  if (puntuadas[1] && puntuadas[1].d < puntuadas[0].d * 1.5) return null
  return puntuadas[0].c
}

const PALABRAS_QUE_NO_SON_CALLE = /ELEVACION|ESTE|NORTE|OESTE|SUD|PLANTA|ESCALA|AREA|TERRENO|LOTE|SUPERFICIE|CUBIERTA|CALAMINA/

/**
 * Calles que el plano rotula SIN "AV."/"CALLE" ("BONIFACIA DE TORRICO"): texto vertical, en
 * mayusculas, claro, con nombre largo, fuera de la masa de rotulos del edificio. Poco seguro:
 * el vecino que salga de aqui se marca para revisar.
 */
function callesSinPrefijo(bloques, aFrameNorte, ancho) {
  return bloques.filter((b) => {
    if ((b.confidence ?? 1) < 0.9) return false
    const texto = (b.text || '').trim()
    if (!/^[A-ZÁÉÍÓÚÑ\s.]+$/.test(texto) || texto.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length < 10) return false
    if (PALABRAS_QUE_NO_SON_CALLE.test(normTexto(texto).replace(/\s/g, ''))) return false
    const px = b.points.map((p) => p[0])
    const py = b.points.map((p) => p[1])
    if (Math.max(...py) - Math.min(...py) < 1.8 * (Math.max(...px) - Math.min(...px))) return false
    const x = aFrameNorte(blockCenter(b)).x
    return x < ancho * 0.12 || x > ancho * 0.88 // los rotulos del edificio no llegan a los bordes de la hoja
  })
}

const esCalle = (e) => e.tipo === 'leyenda' && (e.generica || /^(AV|AVENIDA|CALLE)\b/i.test(e.valor))

const TOLERANCIA_SUPERFICIE = 0.015

/**
 * Plan B para una unidad cuyo NOMBRE el OCR no leyó: cada rótulo del plano trae
 * debajo su superficie ("101.66 M2"), y la tabla de superficies dice cuánto mide
 * cada unidad. Si esa medida es única entre las unidades de la planta, el bloque
 * "101.66 M2" ubica la unidad. Devuelve { pos, bloques } o null.
 */
const reSuperficie = /(\d{1,4})\s*[.,:-]\s*(\d{2})\s*[-\s]?M\s*[2²]?\s*$/i

// Bloques del plano cuyo texto es "NN.NN M2" con esa medida.
function bloquesConSuperficie(bloques, medida) {
  return bloques.filter((b) => {
    if ((b.confidence ?? 1) < 0.6) return false
    const m = reSuperficie.exec((b.text || '').trim())
    return Boolean(m) && Math.abs(parseFloat(`${m[1]}.${m[2]}`) - medida) <= TOLERANCIA_SUPERFICIE
  })
}

function buscarPorSuperficie(bloques, nombre, areas) {
  const mia = areas?.[nombre]
  if (!(mia > 0)) return null
  const repetida = Object.entries(areas).some(([otro, v]) => otro !== nombre && Math.abs(v - mia) <= TOLERANCIA_SUPERFICIE)
  if (repetida) return null
  const hallados = bloquesConSuperficie(bloques, mia)
  if (hallados.length === 0) return null
  const mejor = hallados.sort((a, b) => (b.confidence ?? 1) - (a.confidence ?? 1))[0]
  return { pos: blockCenter(mejor), bloques: [mejor.text] }
}

const LEYENDAS_DE_TEXTO_COMPLETO = new Set(['AV.', 'AVENIDA'])

export function analizarColindancias(bloquesCrudos, nombresUnidadesPlanta, norte, tamañoImagen, opciones = {}) {
  const areas = opciones.areas || {}
  const bloquesOcr = quitarListasDeTabla(bloquesCrudos)
  const radio = radioAgrupado(tamañoImagen.width, tamañoImagen.height)
  const cx = tamañoImagen.width / 2
  const cy = tamañoImagen.height / 2
  const angleDeg = norte?.angleDeg || 0

  const aFrameNorte = (p) => rotatePoint(p.x, p.y, cx, cy, -angleDeg)

  const etiquetas = []
  const busquedas = []
  const ubicar = (tipo, valor) => {
    // Avenidas: puede haber varias en el mismo plano (una por cada frente) y lo
    // útil es su nombre completo, no la palabra "AV.": cada rótulo es una
    // etiqueta con su propio texto.
    if (tipo === 'leyenda' && LEYENDAS_DE_TEXTO_COMPLETO.has(valor)) {
      const clave = normTexto(valor).split(' ').filter(Boolean)
      // Solo rótulos con nombre ("AV. CIRCUNVALACION ..."): un "AV." suelto es un
      // pedazo de otra cosa.
      const hallados = bloquesOcr.filter((b) => {
        const tokens = tokensBloque(b)
        return (
          (b.confidence ?? 1) >= UMBRAL_CONFIANZA_ROTULO &&
          tokens.length >= 2 &&
          tokens.some((t) => t.length >= 4 && !esNumero(t)) &&
          contieneSecuencia(tokens, clave)
        )
      })
      hallados.forEach((b) => {
        const pos = blockCenter(b)
        const texto = (b.text || '').replace(/[�]/g, '').replace(/\s+/g, ' ').trim()
        etiquetas.push({ tipo, valor: texto, mostrar: texto, ...aFrameNorte(pos) })
      })
      busquedas.push({
        tipo,
        valor,
        encontrada: hallados.length > 0,
        ...(hallados.length ? { bloquesUsados: hallados.map((b) => b.text) } : { motivo: `ningún bloque del OCR tiene "${valor}"` }),
      })
      return
    }
    let d = buscarFraseDetalle(bloquesOcr, valor, radio)
    let porSuperficie = false
    let aprox = ''
    if (d.pos && tipo === 'unidad' && d.candidatas?.length > 1) {
      // El mismo nombre esta en varios lugares (p.ej. "PARQUEO 2" de autos y de motos): se elige el que tiene al lado su superficie.
      const elegida = desambiguarPorSuperficie(d.candidatas, bloquesConSuperficie(bloquesOcr, areas[valor]), radio)
      if (elegida) d = { ...d, pos: elegida.pos, bloques: elegida.bloques }
      else aprox = 'el nombre aparece en varios lugares del plano'
    }
    if (!d.pos && tipo === 'unidad') {
      const alt = buscarPorSuperficie(bloquesOcr, valor, areas)
      if (alt) {
        d = { ...alt, coincidencias: 1 }
        porSuperficie = true
        aprox = 'unidad ubicada por su superficie, no por su nombre'
      }
    }
    const registro = { tipo, valor, encontrada: Boolean(d.pos) }
    if (d.pos) {
      const enNorte = aFrameNorte(d.pos)
      etiquetas.push({ tipo, valor, mostrar: sinAclaracion(valor) || valor, aprox, ...enNorte })
      registro.posicionImagen = { x: redondear(d.pos.x), y: redondear(d.pos.y) }
      registro.posicionNorteArriba = { x: redondear(enNorte.x), y: redondear(enNorte.y) }
      registro.bloquesUsados = d.bloques
      if (porSuperficie) registro.ubicadaPorSuperficie = true
      if (aprox && !porSuperficie) registro.ambigua = true
      if (d.coincidencias > 1) registro.coincidenciasDelPrimerToken = d.coincidencias
    } else {
      registro.motivo = d.motivo
      if (d.textoCerca) registro.textoCerca = d.textoCerca
    }
    busquedas.push(registro)
  }
  nombresUnidadesPlanta.forEach((nombre) => ubicar('unidad', nombre))
  LEYENDAS_COLINDANCIA.forEach((leyenda) => ubicar('leyenda', leyenda.trim()))

  // Calles sin "AV."/"CALLE" delante.
  callesSinPrefijo(bloquesOcr, aFrameNorte, tamañoImagen.width).forEach((b) => {
    if (etiquetas.some((e) => e.tipo === 'leyenda' && e.valor === (b.text || '').trim())) return
    const texto = (b.text || '').trim().replace(/([A-Z]{4,})DE(?=\s)/, '$1 DE')
    etiquetas.push({ tipo: 'leyenda', valor: texto, mostrar: texto, generica: true, ...aFrameNorte(blockCenter(b)) })
    busquedas.push({ tipo: 'leyenda', valor: texto, encontrada: true, bloquesUsados: [b.text], callePorUbicacion: true })
  })

  // Unidades con la MISMA superficie ("PARQUEO 1" y "PARQUEO 2" de 10.12 m2) que el nombre no ubico: cada
  // rotulo de superficie sobrante se reparte en orden de numeracion a lo largo del eje donde mas se separan.
  const ubicadasPorNombre = (n) => etiquetas.some((e) => e.tipo === 'unidad' && e.valor === n)
  const atendidas = new Set()
  nombresUnidadesPlanta.forEach((n) => {
    if (ubicadasPorNombre(n) || atendidas.has(n) || !(areas[n] > 0)) return
    const mismos = nombresUnidadesPlanta.filter((m) => Math.abs((areas[m] || 0) - areas[n]) <= TOLERANCIA_SUPERFICIE)
    const pendientes = mismos.filter((m) => !ubicadasPorNombre(m))
    pendientes.forEach((m) => atendidas.add(m))
    const yaPuestas = etiquetas.filter((e) => e.tipo === 'unidad' && mismos.includes(e.valor))
    const libres = bloquesConSuperficie(bloquesOcr, areas[n])
      .map((b) => ({ b, n: aFrameNorte(blockCenter(b)) }))
      .filter((r) => yaPuestas.every((e) => Math.hypot(e.x - r.n.x, e.y - r.n.y) > radio * 1.5))
    if (libres.length === 0 || libres.length !== pendientes.length) return
    const rangoX = Math.max(...libres.map((r) => r.n.x)) - Math.min(...libres.map((r) => r.n.x))
    const rangoY = Math.max(...libres.map((r) => r.n.y)) - Math.min(...libres.map((r) => r.n.y))
    libres.sort((p, q) => (rangoX >= rangoY ? p.n.x - q.n.x : p.n.y - q.n.y))
    const numero = (s) => Number((s.match(/(\d+)\s*$/) || [0, 0])[1])
    ;[...pendientes].sort((p, q) => numero(p) - numero(q) || p.localeCompare(q)).forEach((nombre, i) => {
      const r = libres[i]
      const aprox = 'ubicada por su superficie y el orden de su numeracion'
      etiquetas.push({ tipo: 'unidad', valor: nombre, mostrar: sinAclaracion(nombre) || nombre, aprox, ...r.n })
      const reg = busquedas.find((x) => x.tipo === 'unidad' && x.valor === nombre)
      if (reg) {
        delete reg.motivo
        Object.assign(reg, {
          encontrada: true,
          posicionImagen: { x: redondear(blockCenter(r.b).x), y: redondear(blockCenter(r.b).y) },
          posicionNorteArriba: { x: redondear(r.n.x), y: redondear(r.n.y) },
          bloquesUsados: [r.b.text],
          ubicadaPorSuperficie: true,
        })
      }
    })
  })

  const sugerencias = {}
  const detallePorUnidad = {}
  const dudasPorUnidad = {}
  const unidadesUbicadas = etiquetas.filter((e) => e.tipo === 'unidad')

  unidadesUbicadas.forEach((origen) => {
    const porSector = { norte: [], este: [], sud: [], oeste: [] }
    etiquetas.forEach((destino) => {
      if (destino === origen) return
      const dx = destino.x - origen.x
      const dy = destino.y - origen.y
      porSector[sectorDe(dx, dy)].push({
        valor: destino.mostrar,
        tipo: destino.tipo,
        distancia: redondear(Math.hypot(dx, dy)),
        // Rumbo desde la unidad, con el norte arriba (0 = norte, 90 = este).
        rumboDeg: redondear(((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360),
      })
    })
    const sugerencia = {}
    const detalle = {}
    const dudas = {}
    const todos = Object.values(porSector).flat()
    const centroX = unidadesUbicadas.reduce((a, u) => a + u.x, 0) / unidadesUbicadas.length
    const calleDelLado = (lado) => {
      const propias = etiquetas.filter((e) => {
        if (!esCalle(e)) return false
        const dx = e.x - origen.x
        const dy = e.y - origen.y
        // La calle de un costado esta del mismo lado que el centro de las unidades (si no, es la del otro costado).
        if (lado === 'este') return dx > 0 && e.x > centroX
        if (lado === 'oeste') return dx < 0 && e.x < centroX
        return lado === 'sud' ? dy > 0 && Math.abs(dy) > Math.abs(dx) : dy < 0 && Math.abs(dy) > Math.abs(dx)
      })
      return propias.sort((a, b) => Math.hypot(a.x - origen.x, a.y - origen.y) - Math.hypot(b.x - origen.x, b.y - origen.y))[0]
    }
    Object.entries(porSector).forEach(([lado, candidatos]) => {
      candidatos.sort((a, b) => a.distancia - b.distancia)
      sugerencia[lado] = candidatos[0]?.valor || 'ESPACIO EXTERIOR'
      let motivo = motivoDeDuda(lado, candidatos, todos, origen, etiquetas)
      if (!candidatos.length) {
        // Sin vecino a la vista, el lado da a la calle que corre por ese costado del lote (aunque este lejos).
        const calle = calleDelLado(lado)
        if (calle) {
          sugerencia[lado] = calle.mostrar
          motivo = 'calle asumida: la mas cercana de ese costado'
        }
      }
      if (motivo) dudas[lado] = motivo
      detalle[lado] = {
        elegido: sugerencia[lado],
        porDefecto: candidatos.length === 0,
        candidatos: candidatos.slice(0, 5),
      }
    })
    // El mismo vecino en dos lados de una unidad es casi siempre un error de uno de los dos.
    const lados = Object.keys(sugerencia)
    lados.forEach((a) =>
      lados.forEach((b) => {
        if (a < b && sugerencia[a] === sugerencia[b] && sugerencia[a] !== 'ESPACIO EXTERIOR') {
          dudas[a] = dudas[a] || 'el mismo vecino aparece en dos lados'
          dudas[b] = dudas[b] || 'el mismo vecino aparece en dos lados'
        }
      }),
    )
    sugerencias[origen.valor] = sugerencia
    detallePorUnidad[origen.valor] = detalle
    dudasPorUnidad[origen.valor] = dudas
  })

  return {
    sugerencias,
    detalle: {
      radioAgrupadoPx: radio,
      anguloNorteUsado: angleDeg,
      busquedas,
      unidadesSinUbicar: nombresUnidadesPlanta.filter((n) => !sugerencias[n]),
      dudas: dudasPorUnidad,
      porUnidad: detallePorUnidad,
    },
  }
}

/**
 * Sugiere, para cada unidad de una planta, qué colinda con ella en cada
 * dirección (NORTE/ESTE/SUD/OESTE) a partir del OCR de la página del plano
 * de esa planta -- para precargar la columna E de COLINDANCIAS (ver
 * sheet2Excel.js) que la plantilla deja en blanco.
 *
 * Es una detección ASISTIDA, no un reemplazo del ingeniero: el resultado
 * siempre se muestra en un <select> editable (ColindanciasSection.jsx) antes
 * de guardar. Dos simplificaciones deliberadas frente a "visión completa":
 *
 *   1. No se segmentan los muros del dibujo (identificar el polígono real de
 *      cada ambiente en una foto de celular con dobleces/inclinación es
 *      frágil). En cambio se ubica el CENTRO de la etiqueta de texto de cada
 *      unidad/leyenda (ya sabemos qué nombres buscar: son los mismos
 *      "Ambiente" que ya cargó el usuario en Hoja2 para esa planta, más las
 *      7 leyendas fijas de COLINDANCIAS) y se razona por cercanía angular
 *      desde ese centro -- igual que un humano mirando el plano a ojo.
 *   2. Un lado sugiere UN solo vecino (no la concatenación "X - Y - Z" que
 *      la plantilla real a veces usa para esquinas): eso requeriría saber el
 *      ancho real de cada lado, que sí depende de los muros. El usuario
 *      puede agregar manualmente un segundo vecino en el <select> (admite
 *      texto libre) si el plano lo amerita.
 *
 * Requiere que detectNorth() ya haya corrido sobre la misma imagen -- el
 * ángulo detectado se usa para rotar todas las posiciones a un sistema
 * "arriba = norte" antes de decidir qué es N/E/S/O de qué.
 */
import { rotatePoint } from './planNorthDetector'

// Las 7 leyendas fijas de COLINDANCIAS!C3:C9 (ver plantilla-ph.xlsm) -- si el
// OCR encuentra alguna de ellas escrita en el plano, es una colindancia
// exterior (no otra unidad del propio edificio). "CALLE" es un prefijo: el
// nombre real de la calle casi siempre sigue ("CALLE ANTONIO QUIJARRO...").
//
// "LOTE Nº" y "R.M." NO son parte de esas 7 (no estan en C3:C9 de la
// plantilla) pero aparecen como rotulo de colindancia real en planos reales
// (linda con el lote vecino / retiro municipal) -- se agregan igual como
// prefijo reconocible, igual que "CALLE". "R.M." y "LOTE Nº" tienen letras
// sueltas, así que se exigen enteros y seguidos en un mismo bloque (ver
// claveDe) -- si no, calzaban con cualquier texto con una R y una M cerca.
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

// Separa letras de numeros pegados ("BAULERA1" -> "BAULERA 1") antes de
// tokenizar: en Hoja2 el "Ambiente" a veces se tipea sin espacio antes del
// numero, pero en el plano casi siempre esta dibujado CON espacio ("BAULERA
// 1") y el OCR lo lee como dos bloques separados -- sin este paso, buscar
// "Baulera1" nunca calzaba contra el texto "BAULERA 1" del plano (el token
// unico "BAULERA1" no es substring de "BAULERA 1") y la unidad se quedaba
// sin sugerencia aunque estuviera bien dibujada.
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

// Radio (px, relativo al tamaño de imagen) dentro del cual se juntan bloques
// de OCR vecinos para reconstruir una etiqueta partida en varias líneas
// ("PARQUEO" / "ELECTRICO 5") -- no intenta reconstruir el orden de lectura
// exacto (las etiquetas suelen ir rotadas siguiendo el ambiente), solo junta
// los bloques para buscar las palabras del nombre.
function radioAgrupado(cols, rows) {
  return Math.max(40, Math.round(Math.min(cols, rows) * 0.05))
}

// Medidas y superficies ("SUP 13.44m2", "2.80", "1=20%", "ESC: 1:100")
// llenan el plano de números que NO son parte de ningún nombre: si se
// dejaran, el "2" de "Parqueo Eléctrico 2" calzaba con el "2" de "m2" y el
// "8" de "Baulera 8" con el de "1.80". Se borran antes de tokenizar.
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

// ¿A lo sumo 1 letra de diferencia? El OCR suele comerse o cambiar una letra
// de palabras largas ("BAULER8" por "BAULERA 8").
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

/**
 * Palabra del nombre vs. palabra del OCR: exacta, o 1 letra de error si es
 * larga, o pegada a otra palabra si es muy larga -- en los planos los rótulos
 * se enciman ("SALA DE ESTAR" sobre "DEPARTAMENTO B" sale "ESTARDEPARTAMENTO").
 */
function mismaPalabra(esperada, leida) {
  if (esNumero(esperada) || esNumero(leida)) {
    return esNumero(esperada) && esNumero(leida) && Number(esperada) === Number(leida)
  }
  if (esperada === leida) return true
  if (esperada.length >= 5 && aLoSumoUnCambio(esperada, leida)) return true
  return esperada.length >= 8 && (leida.startsWith(esperada) || leida.endsWith(esperada))
}

// Letras que el OCR confunde con dígitos cuando van pegadas al final de una
// palabra ("ELECTRICOS" por "ELECTRICO 5").
const LETRA_COMO_DIGITO = { O: '0', D: '0', Q: '0', I: '1', L: '1', Z: '2', S: '5', G: '6', B: '8' }

/**
 * ¿Aparece la secuencia `clave` (palabras seguidas, p.ej. ["ELECTRICO","5"])
 * dentro de los tokens de un bloque? Tolera el número pegado y mal leído al
 * final de la palabra anterior.
 */
function contieneSecuencia(tokens, clave) {
  // "ELECTRICOS" = "ELECTRICO" + "5": palabra exacta + letra-dígito pegada.
  // Va primero porque la tolerancia de 1 letra de mismaPalabra ya aceptaría
  // "ELECTRICOS" como "ELECTRICO" y se quedaría esperando el número aparte.
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

/**
 * Qué parte del nombre tiene que estar junta en UN mismo bloque del OCR (la
 * "clave"): la palabra + número que identifica la unidad ("ELECTRICO 5",
 * "BAULERA 8"), o el nombre entero si tiene letras sueltas ("R M", "LOTE N"),
 * que por sí solas calzarían con cualquier texto. Si no, la primera palabra.
 */
function claveDe(tokens) {
  const iNum = tokens.findIndex((t, i) => i > 0 && esNumero(t))
  if (iNum > 0) return { desde: iNum - 1, palabras: tokens.slice(iNum - 1, iNum + 1) }
  if (tokens.some((t) => t.length === 1)) return { desde: 0, palabras: tokens }
  return { desde: 0, palabras: tokens.slice(0, 1) }
}

/**
 * Nombres compuestos de áreas comunes ("HALL+ASCENSOR+ SHAFT+GRADA"): la
 * tabla y el plano casi nunca los escriben igual (el plano dice "ESCALERA"
 * donde la tabla dice "GRADA", el OCR corta "SHAFT" en "SHA", la tabla pega
 * "YMANIOBRA"...), así que no se exige el nombre entero: alcanza con que la
 * MAYORÍA de sus palabras (al menos 2) estén escritas juntas en el plano.
 */
function buscarCompuestoDetalle(bloques, frase, radio) {
  // Sin palabras cortas ("Y", "DE") que calzan con cualquier cosa.
  const tokens = [...new Set(normTexto(frase).split(' ').filter((t) => t.length >= 3))]
  if (tokens.length === 0) return { pos: null, motivo: 'nombre vacío' }
  const necesarias = Math.max(2, Math.ceil(tokens.length / 2))
  if (tokens.length < necesarias) return { pos: null, tokens, motivo: 'nombre compuesto demasiado corto' }

  const conTokens = bloques.map((b) => ({ b, t: tokensBloque(b), c: blockCenter(b) }))
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y)
  // En estos rótulos el OCR pega las palabras ("HALLASCENSORESCALERA") y
  // corta la última ("SHA" por SHAFT): una palabra de 4+ letras vale si
  // aparece DENTRO de lo leído, o si lo leído es su comienzo (3+ letras).
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

/**
 * Busca dónde está escrita `frase` en el plano, juntando bloques de OCR
 * cercanos entre sí. Devuelve en `pos` el centro (promedio) de los bloques
 * que la forman, o null si no aparece.
 *
 * La "clave" del nombre (ver claveDe) tiene que estar en un solo bloque (o
 * la palabra en uno y SOLO su número en otro pegado, como cuando el OCR
 * parte "BAULERA" / "05"); el resto de las palabras, como palabras completas
 * en bloques a menos de `radio` px. Los números se comparan como número
 * entero, nunca como pedazo de texto. Tolera 1 letra mal leída en palabras
 * largas; más que eso lo corrige el usuario en el <input>.
 *
 * Para el log de llenado explica además el resultado: con qué bloques se
 * armó la etiqueta o, si no se encontró, por qué.
 */
function buscarFraseDetalle(bloques, frase, radio) {
  if (frase.includes('+')) return buscarCompuestoDetalle(bloques, frase, radio)
  const tokens = normTexto(frase).split(' ').filter(Boolean)
  if (tokens.length === 0) return { pos: null, motivo: 'nombre vacío' }
  const { desde, palabras: clave } = claveDe(tokens)
  const resto = tokens.filter((_, i) => i < desde || i >= desde + clave.length)

  const conTokens = bloques.map((b) => ({ b, t: tokensBloque(b), c: blockCenter(b) }))
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y)

  // Puntos de partida: bloques con la clave completa, o la palabra al final
  // de un bloque y su número solo en otro bloque muy cercano.
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
    // Centro de los bloques que forman el nombre (no de todo lo que hay
    // cerca). Si hay varias coincidencias (nombre repetido/ambiguo), se
    // prefiere la que usa menos bloques -- la etiqueta más "limpia" -- y, a
    // igualdad, la que no es un anexo de otra unidad: en "PARQUEO 3 +BAULERA
    // 1" la baulera se nombra dentro del rótulo del parqueo, pero su propio
    // ambiente tiene el rótulo "BAULERA 1" sin el "+".
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

// Palabras sueltas que sobreviven a limpiarMedidas() pero no son parte de
// ningún nombre de ambiente ("SUP 13.44m2" deja "SUP", "ESC: 1:100" deja
// "ESC"...).
const RUIDO_ROTULO = new Set(['SUP', 'ESC', 'Y', 'DE', 'M', 'M2', 'N'])

// Un bloque mal leído casi siempre sale con confianza más baja que uno bien
// leído: contra un plano real de 8 plantas, rótulos genuinos (DEPOSITO, BAÑO,
// SALA DE...) salieron 0.75+ mientras que ruido inventado por el OCR sobre
// texto chico o rotado ("HOOOO", "CASIKIO", "FECTRRON", "POOROOORO") salió
// por debajo de 0.65 -- se descartan antes de tokenizar.
const UMBRAL_CONFIANZA_ROTULO = 0.68

// ¿Los tokens de un bloque son (o contienen completa) una de las 7 leyendas
// fijas? Esas ya se buscan aparte (LEYENDAS_COLINDANCIA) y no son "Ambiente".
function esLeyenda(tokens) {
  return LEYENDAS_COLINDANCIA.some((leyenda) => {
    const tLeyenda = normTexto(leyenda).split(' ').filter(Boolean)
    return tLeyenda.every((t) => tokens.includes(t))
  })
}

/**
 * Candidatos a "Ambiente" leídos directamente del plano, para una planta que
 * todavía no tiene filas en Hoja2 -- así ColindanciasSection puede detectar
 * esa planta por su cuenta, sin depender de que la tabla de superficies esté
 * cargada. Cada bloque del OCR que no sea una medida, una leyenda fija ni
 * ruido se toma como rótulo de unidad; buscarFraseDetalle() lo vuelve a
 * ubicar después igual que a un nombre de Hoja2, así que el resultado y el
 * log de llenado salen con el mismo formato.
 *
 * Es deliberadamente más permisivo que preciso (puede sacar algún rótulo de
 * más, como un "PARQUEO" suelto de una etiqueta partida en dos líneas): el
 * usuario revisa y edita cada tarjeta antes de guardar, así que conviene más
 * una unidad de más -- se ignora -- que una de menos -- no se ve.
 */
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
  // Un rótulo sin número ("PARQUEO") suele ser el resto de una etiqueta que
  // el OCR partió en dos líneas y cuya versión completa ("PARQUEO 6") ya
  // quedó como candidato aparte -- se descarta el suelto para no duplicar.
  const conNumero = nombres.filter((n) => /\d/.test(n))
  return nombres.filter((n) => /\d/.test(n) || !conNumero.some((c) => c.startsWith(`${n} `)))
}

// Sector cardinal (frame "arriba = norte") del vector (dx,dy) -- ver
// convencion de angulo en planNorthDetector.js: coords de imagen, Y hacia
// abajo. Divide el circulo en 4 conos de 90 centrados en cada eje.
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

/**
 * Mismo cálculo que detectColindancias, pero devuelve además el detalle paso
 * a paso para el "log de llenado" de colindancias (ColindanciasSection.jsx):
 * dónde se ubicó cada etiqueta (o por qué no) y, por unidad y lado, todos los
 * candidatos con su distancia -- para ver por qué salió cada sugerencia.
 */
export function analizarColindancias(bloquesOcr, nombresUnidadesPlanta, norte, tamañoImagen) {
  const radio = radioAgrupado(tamañoImagen.width, tamañoImagen.height)
  const cx = tamañoImagen.width / 2
  const cy = tamañoImagen.height / 2
  const angleDeg = norte?.angleDeg || 0

  const aFrameNorte = (p) => rotatePoint(p.x, p.y, cx, cy, -angleDeg)

  // Ubica cada unidad conocida (nombres que ya estan en Hoja2 para esta
  // planta) y cada leyenda fija -- ambos son "candidatos a vecino".
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
    // Sin nada detectado en un lado: sugerencia por defecto ESPACIO EXTERIOR
    // (nada construido ahí que el OCR haya podido leer) -- el usuario la
    // corrige si en verdad hay un vecino/calle que el OCR no captó.
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

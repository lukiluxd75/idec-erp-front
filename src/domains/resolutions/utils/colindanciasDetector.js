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
export const LEYENDAS_COLINDANCIA = [
  'MURO DE CONTENCION',
  'AREA COMUN',
  'VACIO',
  'ESPACIO EXTERIOR',
  'AREA DE CIRCULACION VEHICULAR',
  'VECINO',
  'CALLE',
]

function normTexto(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
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
// el texto para buscar substrings.
function radioAgrupado(cols, rows) {
  return Math.max(40, Math.round(Math.min(cols, rows) * 0.05))
}

/**
 * Busca dónde está escrita `frase` en el plano, juntando bloques de OCR
 * cercanos entre sí. Devuelve el centro (promedio) de los bloques que la
 * forman, o null si no aparece. Tolerante a como venga separada en bloques,
 * NO tolerante a errores de OCR letra por letra (igual que el resto del
 * pipeline de esta pantalla: si el OCR lee mal el texto, el usuario corrige
 * a mano en el <select>).
 */
function buscarFrase(bloques, frase, radio) {
  const tokens = normTexto(frase).split(' ').filter(Boolean)
  if (tokens.length === 0) return null

  // Bloque(s) que contienen el primer token -- puntos de partida para juntar
  // vecinos.
  const candidatosInicio = bloques.filter((b) => normTexto(b.text).includes(tokens[0]))

  let mejor = null
  for (const inicio of candidatosInicio) {
    const centroInicio = blockCenter(inicio)
    // Junta todo bloque dentro del radio (incluido `inicio`), sin importar
    // el orden -- alcanza con que el conjunto de texto contenga TODOS los
    // tokens de la frase buscada.
    const cercanos = bloques.filter((b) => {
      const c = blockCenter(b)
      return Math.hypot(c.x - centroInicio.x, c.y - centroInicio.y) <= radio
    })
    const textoJunto = normTexto(cercanos.map((b) => b.text).join(' '))
    const faltaAlguno = tokens.some((t) => !textoJunto.includes(t))
    if (faltaAlguno) continue

    const cx = cercanos.reduce((a, b) => a + blockCenter(b).x, 0) / cercanos.length
    const cy = cercanos.reduce((a, b) => a + blockCenter(b).y, 0) / cercanos.length
    // Si hay varias coincidencias (nombre repetido/ambiguo), se prefiere la
    // que junto menos bloques ajenos -- mas probable que sea la etiqueta
    // "limpia" y no una mezcla con texto de al lado.
    if (!mejor || cercanos.length < mejor.n) mejor = { x: cx, y: cy, n: cercanos.length }
  }
  return mejor ? { x: mejor.x, y: mejor.y } : null
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
  const radio = radioAgrupado(tamañoImagen.width, tamañoImagen.height)
  const cx = tamañoImagen.width / 2
  const cy = tamañoImagen.height / 2
  const angleDeg = norte?.angleDeg || 0

  const aFrameNorte = (p) => rotatePoint(p.x, p.y, cx, cy, -angleDeg)

  // Ubica cada unidad conocida (nombres que ya estan en Hoja2 para esta
  // planta) y cada leyenda fija -- ambos son "candidatos a vecino".
  const etiquetas = []
  nombresUnidadesPlanta.forEach((nombre) => {
    const pos = buscarFrase(bloquesOcr, nombre, radio)
    if (pos) etiquetas.push({ tipo: 'unidad', valor: nombre, ...aFrameNorte(pos) })
  })
  LEYENDAS_COLINDANCIA.forEach((leyenda) => {
    const pos = buscarFrase(bloquesOcr, leyenda, radio)
    if (pos) etiquetas.push({ tipo: 'leyenda', valor: leyenda.trim(), ...aFrameNorte(pos) })
  })

  const sugerencias = {}
  const unidadesUbicadas = etiquetas.filter((e) => e.tipo === 'unidad')

  unidadesUbicadas.forEach((origen) => {
    const porSector = { norte: null, este: null, sud: null, oeste: null }
    etiquetas.forEach((destino) => {
      if (destino === origen) return
      const dx = destino.x - origen.x
      const dy = destino.y - origen.y
      const dist = Math.hypot(dx, dy)
      const sector = sectorDe(dx, dy)
      if (!porSector[sector] || dist < porSector[sector].dist) {
        porSector[sector] = { valor: destino.valor, dist }
      }
    })
    // Sin nada detectado en un lado: sugerencia por defecto ESPACIO EXTERIOR
    // (nada construido ahí que el OCR haya podido leer) -- el usuario la
    // corrige si en verdad hay un vecino/calle que el OCR no captó.
    sugerencias[origen.valor] = {
      norte: porSector.norte?.valor || 'ESPACIO EXTERIOR',
      este: porSector.este?.valor || 'ESPACIO EXTERIOR',
      sud: porSector.sud?.valor || 'ESPACIO EXTERIOR',
      oeste: porSector.oeste?.valor || 'ESPACIO EXTERIOR',
    }
  })

  return sugerencias
}

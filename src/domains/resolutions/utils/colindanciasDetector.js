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
// prefijo reconocible, igual que "CALLE". "R.M." es mas riesgoso: son solo
// 2 letras sueltas, asi que puede matchear con texto ajeno que tenga una R y
// una M cerca por casualidad -- como toda sugerencia, queda en el <input>
// editable, el usuario la corrige si no corresponde.
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
// el texto para buscar substrings.
function radioAgrupado(cols, rows) {
  return Math.max(40, Math.round(Math.min(cols, rows) * 0.05))
}

/**
 * Busca dónde está escrita `frase` en el plano, juntando bloques de OCR
 * cercanos entre sí. Devuelve en `pos` el centro (promedio) de los bloques
 * que la forman, o null si no aparece. Tolerante a como venga separada en
 * bloques, NO tolerante a errores de OCR letra por letra (igual que el resto
 * del pipeline de esta pantalla: si el OCR lee mal el texto, el usuario
 * corrige a mano en el <select>).
 *
 * Para el log de llenado explica además el resultado: con qué bloques se
 * armó la etiqueta o, si no se encontró, por qué.
 */
function buscarFraseDetalle(bloques, frase, radio) {
  const tokens = normTexto(frase).split(' ').filter(Boolean)
  if (tokens.length === 0) return { pos: null, motivo: 'nombre vacío' }

  // Bloque(s) que contienen el primer token -- puntos de partida para juntar
  // vecinos.
  const candidatosInicio = bloques.filter((b) => normTexto(b.text).includes(tokens[0]))
  if (candidatosInicio.length === 0) {
    return { pos: null, tokens, motivo: `ningún bloque del OCR contiene "${tokens[0]}"` }
  }

  let mejor = null
  let menosFaltantes = null
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
    const faltantes = tokens.filter((t) => !textoJunto.includes(t))
    if (faltantes.length > 0) {
      if (!menosFaltantes || faltantes.length < menosFaltantes.faltantes.length) {
        menosFaltantes = { faltantes, textoCerca: cercanos.map((b) => b.text) }
      }
      continue
    }

    const cx = cercanos.reduce((a, b) => a + blockCenter(b).x, 0) / cercanos.length
    const cy = cercanos.reduce((a, b) => a + blockCenter(b).y, 0) / cercanos.length
    // Si hay varias coincidencias (nombre repetido/ambiguo), se prefiere la
    // que junto menos bloques ajenos -- mas probable que sea la etiqueta
    // "limpia" y no una mezcla con texto de al lado.
    if (!mejor || cercanos.length < mejor.n) {
      mejor = { x: cx, y: cy, n: cercanos.length, bloques: cercanos.map((b) => b.text) }
    }
  }
  if (mejor) {
    return {
      pos: { x: mejor.x, y: mejor.y },
      tokens,
      bloques: mejor.bloques,
      coincidencias: candidatosInicio.length,
    }
  }
  return {
    pos: null,
    tokens,
    motivo:
      `"${tokens[0]}" aparece en ${candidatosInicio.length} bloque(s), pero a menos de ${radio} px ` +
      `no están: ${menosFaltantes.faltantes.join(', ')}`,
    textoCerca: menosFaltantes.textoCerca,
  }
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

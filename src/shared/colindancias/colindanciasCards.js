/**
 * Helpers puros para armar las tarjetas de colindancias a partir de
 * `analizarColindancias()`, compartidos entre resolutions (ColindanciasSection,
 * por planta con tabla de superficies opcional) y folder-analysis
 * (PlanColindancias, por página, siempre sin tabla).
 */

/**
 * Dónde hacer zoom en la tarjeta de cada unidad: el rótulo de la unidad en
 * el plano (posición en la imagen original) y el ancho de la "ventana"
 * visible -- 3 veces la distancia al vecino elegido más cercano (se ve la
 * unidad y lo que la rodea), acotado entre 12% y 40% del plano.
 */
export function focosDe(detalle, ancho, alto) {
  const lado = Math.max(ancho, alto)
  const focos = {}
  detalle.busquedas
    .filter((b) => b.tipo === 'unidad' && b.encontrada)
    .forEach((b) => {
      const distancias = Object.values(detalle.porUnidad[b.valor] || {})
        .map((l) => l.candidatos[0]?.distancia)
        .filter(Boolean)
      const base = distancias.length ? Math.min(...distancias) * 3 : lado * 0.25
      focos[b.valor] = {
        x: b.posicionImagen.x,
        y: b.posicionImagen.y,
        ventana: Math.min(lado * 0.4, Math.max(lado * 0.12, base)),
      }
    })
  return focos
}

/**
 * Por qué no se ubicó cada unidad (texto del log de llenado): se usa para
 * sacarla de `unidadesVisibles` -- si no está en ESTE plano no es de esta
 * planta/página.
 */
export function motivosDe(detalle) {
  const motivos = {}
  detalle.busquedas
    .filter((b) => b.tipo === 'unidad' && !b.encontrada)
    .forEach((b) => {
      motivos[b.valor] = b.motivo
    })
  return motivos
}

/**
 * Unidades con tarjeta propia de una sección (planta o página): con nombres
 * conocidos de antemano (tabla de superficies, solo en resolutions), esos;
 * si no, los ya autodetectados del plano (`datos.nombres`). Después de
 * detectar (`datos.motivos` existe), se saca lo que el OCR no encontró en
 * ESE plano -- un nombre que no aparece ahí no es de esa sección (pertenece
 * a otra, o la fuente lo trajo mal).
 *
 * `nombresDeTabla` es `[]` en folder-analysis (no hay tabla ahí): siempre
 * cae al autodetectado, sin necesitar casos aparte.
 */
export function unidadesVisibles(nombresDeTabla, datos) {
  const nombresConocidos = nombresDeTabla.length ? nombresDeTabla : datos?.nombres || []
  return datos?.motivos ? nombresConocidos.filter((a) => !datos.motivos[a]) : nombresConocidos
}

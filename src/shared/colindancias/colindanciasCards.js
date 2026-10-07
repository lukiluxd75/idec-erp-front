
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

export function motivosDe(detalle) {
  const motivos = {}
  detalle.busquedas
    .filter((b) => b.tipo === 'unidad' && !b.encontrada)
    .forEach((b) => {
      motivos[b.valor] = b.motivo
    })
  return motivos
}

export function unidadesVisibles(nombresDeTabla, datos) {
  const nombresConocidos = nombresDeTabla.length ? nombresDeTabla : datos?.nombres || []
  return datos?.motivos ? nombresConocidos.filter((a) => !datos.motivos[a]) : nombresConocidos
}

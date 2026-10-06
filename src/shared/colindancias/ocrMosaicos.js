/**
 * OCR de una página de plano grande o alargada, por mosaicos.
 *
 * El servicio OCR lee mal las imágenes muy grandes o muy alargadas: en un plano
 * de 1000x3600 px (o de 2900x2900) devuelve un puñado de bloques -- los
 * rótulos de unidad ("LOCAL 1", "DEPARTAMENTO F") son letra chica frente a la
 * página y se pierden. Cortada en mosaicos de lado acotado, la misma letra
 * queda más grande respecto a la imagen y sí se lee (mismo criterio que
 * plan_tiles.py en el backend, que lo hace para el título del plano).
 *
 * Se lee la página entera (como siempre; sirve para los rótulos GRANDES, que un
 * mosaico parte, como el nombre de la calle) y además cada mosaico; los bloques
 * se llevan a las coordenadas de la página y se quitan los repetidos de la zona
 * de solape. Una imagen que ya cabe en un mosaico se lee una sola vez, igual
 * que antes.
 */
import { ocrImage } from './ocrClient'

// 1100 y no 1400: en planos de ~3000 px los rótulos de unidad ("DEPARTAMENTO E",
// "LOCAL 7") se leen bastante mejor con mosaicos más chicos (probado con planos
// reales de P.H.: 12 de 17 unidades contra 10 de 17 con 1400).
export const LADO_MOSAICO = 1100
export const SOLAPE_MOSAICO = 0.2 // fracción compartida con el vecino: un rótulo cortado en el borde cae entero en el siguiente
export const MAX_MOSAICOS = 40
const CONCURRENCIA = 3

/** Tramos [ini, fin) que cubren `largo` con mosaicos de `lado` y solape fijo. */
export function cortesDe(largo, lado) {
  if (largo <= lado) return [[0, largo]]
  const paso = Math.floor(lado * (1 - SOLAPE_MOSAICO))
  const tramos = []
  let ini = 0
  for (;;) {
    const fin = Math.min(ini + lado, largo)
    tramos.push([ini, fin])
    if (fin >= largo) return tramos
    ini += paso
  }
}

/** Mosaicos { x0, y0, x1, y1 } de una imagen; [] si cabe en uno solo o saldrían demasiados. */
export function planearMosaicos(ancho, alto, lado = LADO_MOSAICO) {
  const cols = cortesDe(ancho, lado)
  const filas = cortesDe(alto, lado)
  const total = cols.length * filas.length
  if (total <= 1 || total > MAX_MOSAICOS) return []
  const mosaicos = []
  filas.forEach(([y0, y1]) => cols.forEach(([x0, x1]) => mosaicos.push({ x0, y0, x1, y1 })))
  return mosaicos
}

function caja(b) {
  const xs = b.points.map((p) => p[0])
  const ys = b.points.map((p) => p[1])
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

/** Fracción de la caja MÁS CHICA que cae dentro de la otra (1 = una contiene a la otra). */
function solapeSobreMenor(a, b) {
  const ix = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
  const iy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
  if (ix <= 0 || iy <= 0) return 0
  const menor = Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0))
  return menor > 0 ? (ix * iy) / menor : 0
}

const largoTexto = (b) => (b.text || '').replace(/\s+/g, '').length

/**
 * Quita los bloques repetidos (la misma palabra leída en dos mosaicos, o en la
 * página entera y en un mosaico): dos bloques son el mismo si la caja del más
 * chico cae en más de un 60% dentro de la del otro. Se queda el de texto más
 * largo -- un mosaico que corta una palabra en su borde lee un pedazo
 * ("DEPARTAM") con confianza alta, y no tiene que ganarle a la lectura
 * completa ("DEPARTAMENTO B") -- y, a igual largo, el de mayor confianza.
 */
export function fusionarBloques(bloques) {
  const cajas = bloques.map(caja)
  const quitar = new Set()
  for (let i = 0; i < bloques.length; i++) {
    if (quitar.has(i)) continue
    for (let j = i + 1; j < bloques.length; j++) {
      if (quitar.has(j)) continue
      if (solapeSobreMenor(cajas[i], cajas[j]) < 0.6) continue
      const li = largoTexto(bloques[i])
      const lj = largoTexto(bloques[j])
      const ganaJ = lj > li || (lj === li && (bloques[j].confidence ?? 0) > (bloques[i].confidence ?? 0))
      if (ganaJ) {
        quitar.add(i)
        break
      }
      quitar.add(j)
    }
  }
  return bloques.filter((_, i) => !quitar.has(i))
}

async function recortar(bitmap, { x0, y0, x1, y1 }) {
  const canvas = document.createElement('canvas')
  canvas.width = x1 - x0
  canvas.height = y1 - y0
  canvas.getContext('2d').drawImage(bitmap, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo recortar el mosaico.'))), 'image/jpeg', 0.9),
  )
}

/**
 * Igual que ocrImage(blob, filename), pero para planos grandes/alargados lee
 * además por mosaicos. Devuelve bloques { points, text, confidence } en
 * coordenadas de la página.
 */
export async function ocrImagenEnMosaicos(blob, filename) {
  const bitmap = await createImageBitmap(blob)
  try {
    const mosaicos = planearMosaicos(bitmap.width, bitmap.height)
    const entera = await ocrImage(blob, filename)
    if (mosaicos.length === 0) return entera

    const resultados = new Array(mosaicos.length)
    let siguiente = 0
    const trabajador = async () => {
      while (siguiente < mosaicos.length) {
        const n = siguiente++
        const m = mosaicos[n]
        const recorte = await recortar(bitmap, m)
        const bloques = await ocrImage(recorte, `${filename.replace(/\.[^.]+$/, '')}_m${n}.jpg`)
        resultados[n] = bloques.map((b) => ({ ...b, points: b.points.map(([x, y]) => [x + m.x0, y + m.y0]) }))
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, mosaicos.length) }, trabajador))
    return fusionarBloques([...resultados.flat(), ...entera])
  } finally {
    bitmap.close?.()
  }
}

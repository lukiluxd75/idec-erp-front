import { jsPDF } from 'jspdf'

const MARGEN = 12 // mm
const ANCHO_PAGINA = 210
const ALTO_PAGINA = 297
const COLUMNAS = 3
const GAP = 6
const ALTO_TEXTO = 22 // mm reservados bajo cada imagen: nombre + 4 valores

function cargarImagen(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('no se pudo cargar la imagen'))
    img.src = url
  })
}

function rasterizarFoco(img, angleDeg, foco, ladoPx) {
  const canvas = document.createElement('canvas')
  canvas.width = ladoPx
  canvas.height = ladoPx
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ladoPx, ladoPx)
  const escala = ladoPx / foco.ventana
  ctx.save()
  ctx.translate(ladoPx / 2, ladoPx / 2)
  ctx.rotate((-angleDeg * Math.PI) / 180)
  ctx.scale(escala, escala)
  ctx.translate(-foco.x, -foco.y)
  ctx.drawImage(img, 0, 0)
  ctx.restore()
  // Círculo rojo sobre el rótulo, igual que la tarjeta en pantalla.
  const r = ladoPx * 0.04
  ctx.strokeStyle = '#dc2626'
  ctx.lineWidth = Math.max(1, ladoPx * 0.008)
  ctx.beginPath()
  ctx.arc(ladoPx / 2, ladoPx / 2, r, 0, Math.PI * 2)
  ctx.stroke()
  return canvas.toDataURL('image/jpeg', 0.85)
}

/**
 * @param {string} titulo Va en el encabezado y en el nombre del archivo (ej.
 *   "Resolución 123/2026" en resolutions, "Plano — <folio>" en folder-analysis).
 * @param {Array<{planta: string, unidades: Array<{nombre: string, valores: object, url: string, angleDeg: number, foco: {x,y,ventana}}>}>} secciones
 *   Una entrada por planta/página, en el mismo orden y con las mismas
 *   unidades que se ven en pantalla.
 */
export async function generarColindanciasPdf(titulo, secciones) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const anchoUtil = ANCHO_PAGINA - MARGEN * 2
  const anchoCelda = (anchoUtil - GAP * (COLUMNAS - 1)) / COLUMNAS
  const altoFila = anchoCelda + ALTO_TEXTO
  let y = MARGEN

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`Colindancias — ${titulo || ''}`, MARGEN, y)
  doc.setFont('helvetica', 'normal')
  y += 10

  const imagenesCargadas = new Map()
  const obtenerImagen = async (url) => {
    if (!imagenesCargadas.has(url)) imagenesCargadas.set(url, cargarImagen(url))
    return imagenesCargadas.get(url)
  }

  for (const seccion of secciones) {
    // Título de planta: salto de página si no entra ni el título + una fila.
    if (y + 7 + altoFila > ALTO_PAGINA - MARGEN) {
      doc.addPage()
      y = MARGEN
    }
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(seccion.planta, MARGEN, y)
    doc.setFont('helvetica', 'normal')
    y += 7

    if (seccion.unidades.length === 0) {
      doc.setFontSize(10)
      doc.setTextColor(130)
      doc.text('Sin unidades detectadas en el plano de esta planta.', MARGEN, y)
      doc.setTextColor(0)
      y += 10
      continue
    }

    let col = 0
    for (const u of seccion.unidades) {
      if (col === 0 && y + altoFila > ALTO_PAGINA - MARGEN) {
        doc.addPage()
        y = MARGEN
      }
      const x = MARGEN + col * (anchoCelda + GAP)
      try {
        const img = await obtenerImagen(u.url)
        const dataUrl = rasterizarFoco(img, u.angleDeg, u.foco, 320)
        doc.addImage(dataUrl, 'JPEG', x, y, anchoCelda, anchoCelda)
      } catch {
        doc.setDrawColor(200)
        doc.rect(x, y, anchoCelda, anchoCelda)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text('Sin imagen', x + anchoCelda / 2, y + anchoCelda / 2, { align: 'center' })
        doc.setTextColor(0)
      }
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(u.nombre, x, y + anchoCelda + 4.5, { maxWidth: anchoCelda })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(
        [
          `N: ${u.valores.norte || '—'}`,
          `E: ${u.valores.este || '—'}`,
          `S: ${u.valores.sud || '—'}`,
          `O: ${u.valores.oeste || '—'}`,
        ],
        x,
        y + anchoCelda + 9,
        { maxWidth: anchoCelda },
      )

      col = (col + 1) % COLUMNAS
      if (col === 0) y += altoFila + GAP
    }
    if (col !== 0) y += altoFila + GAP
    y += 4
  }

  doc.save(`colindancias_${String(titulo || 'plano').replace(/\W+/g, '_')}.pdf`)
}

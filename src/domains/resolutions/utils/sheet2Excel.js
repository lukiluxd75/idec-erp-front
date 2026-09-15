/**
 * Fills Hoja2 of `plantilla-ph.xlsm` with user-reviewed rows and triggers .xlsm download.
 *
 * Column mapping: deduced from the template's real FORMULAS (see server/README.md).
 * WRITTEN columns: A (Floor), B (Block — confirmed by formula O10=B10 under "BLOQUE"),
 * C (Room), D/E (Priv. Built/Free), G (Ideal), H/I (Common Built/Free). Do NOT touch
 * F (=D+E) or J (=D+H): they are formulas. First data row = 10.
 *
 * IMPORTANT about formatting/colors: the template already has per-cell color and format
 * (gray "Descripción", number "0.00", borders, etc. in `xl/styles.xml` via each `<c s="N">`).
 * SheetJS free edition only handles limited styles and drops `s="N"` on every touched cell.
 * So the .xlsm is edited as a ZIP of XML: JSZip rewrites only targeted cell values inside
 * `xl/worksheets/sheetN.xml` (Hoja2), leaving style attributes, other sheets, styles and
 * VBA macros byte-intact.
 */
import JSZip from 'jszip'

const HOJA2 = 'Hoja2'
const FIRST_ROW = 10

const COLUMNAS = {
  planta: 'A',
  bloque: 'B',
  ambiente: 'C',
  sup_privada_construida: 'D',
  sup_privada_libre: 'E',
  sup_ideal: 'G',
  sup_comun_construida: 'H',
  sup_comun_libre: 'I',
}

// "1.234,56" (boliviano) o "1234.56" o con letras pegadas por el OCR -> número.
export function parseNumero(texto) {
  if (texto == null || texto === '') return null
  const bruto = String(texto).trim()
  // Si el agrupador por posicion junto de mas (2-3 ambientes en una sola
  // celda: "12,50 17,21 12,50"), no hay forma de saber cual de esos numeros
  // es el correcto -- concatenar sus digitos daria un numero inventado
  // ("12.501721125", que Excel redondea a "12,50" y parece un dato real sin
  // serlo). Mejor null: la celda queda vacia y el usuario nota que falta
  // revisar esa fila a mano, en vez de llevarse un numero que no es de nadie.
  const partes = bruto.split(/\s+/).filter((p) => /\d/.test(p))
  if (partes.length > 1) return null

  // Si trae coma, esa es la decimal real (formato boliviano) y el punto es de
  // miles -> se borra. Si NO trae coma, el OCR probablemente escribio el
  // punto donde iba una coma (visto en fotos reales: "7.19" en vez de "7,19")
  // -- no hay forma de distinguirlo de un separador de miles mirando solo el
  // texto, pero en esta tabla las superficies de fila SIEMPRE son < 1000 m²,
  // asi que un punto de miles genuino practicamente no aparece. Se asume
  // decimal (tal cual lo entiende parseFloat) en vez de borrarlo: borrarlo
  // multiplicaba el valor por 100-1000 ("7.19" -> 719, "41.44" -> 4144).
  const limpio = bruto.includes(',') ? bruto.replace(/\./g, '').replace(',', '.') : bruto
  const n = parseFloat(limpio.replace(/[^\d.-]/g, ''))
  return Number.isNaN(n) ? null : n
}

function escapeXml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c])
}

// Arma el `<c>` de reemplazo preservando el `s="N"` (estilo) que ya tenia la
// celda de la plantilla en ese address. Los textos van como inline string
// (`t="inlineStr"`) para no tener que tocar sharedStrings.xml.
function construirCeldaXml(addr, attrsPrevios, valor) {
  const estilo = /\ss="(\d+)"/.exec(attrsPrevios || '')
  const sAttr = estilo ? ` s="${estilo[1]}"` : ''
  if (typeof valor === 'number') {
    return `<c r="${addr}"${sAttr}><v>${valor}</v></c>`
  }
  return `<c r="${addr}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${escapeXml(valor)}</t></is></c>`
}

// Reemplaza, en el XML de la hoja, cada `<c r="...">` cuyo address este en
// `valoresPorCelda` — sin tocar ningun otro `<c>` (formulas, otras columnas).
function parchearCeldas(sheetXml, valoresPorCelda) {
  const pendientes = new Set(Object.keys(valoresPorCelda))
  if (pendientes.size === 0) return sheetXml

  const patched = sheetXml.replace(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (full, addr, attrs) => {
    if (!pendientes.has(addr)) return full
    pendientes.delete(addr)
    return construirCeldaXml(addr, attrs, valoresPorCelda[addr])
  })

  if (pendientes.size > 0) {
    throw new Error(
      `La plantilla no tiene fila para: ${[...pendientes].join(', ')} (¿son demasiadas filas para la Hoja2?)`,
    )
  }
  return patched
}

// Ubica `xl/worksheets/sheetN.xml` para el nombre de hoja pedido, leyendo
// workbook.xml + sus relationships (el numero de sheetN.xml no tiene por que
// coincidir con el orden de las pestañas).
async function resolverRutaHoja(zip, nombreHoja) {
  const workbookXml = await zip.file('xl/workbook.xml').async('string')
  const sheetMatch = new RegExp(`<sheet\\b[^>]*name="${nombreHoja}"[^>]*/>`).exec(workbookXml)
  const ridMatch = sheetMatch && /r:id="(rId\d+)"/.exec(sheetMatch[0])
  if (!ridMatch) throw new Error(`La plantilla no tiene una hoja "${nombreHoja}".`)

  const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string')
  const relMatch = new RegExp(`<Relationship\\b[^>]*Id="${ridMatch[1]}"[^>]*/>`).exec(relsXml)
  const targetMatch = relMatch && /Target="([^"]+)"/.exec(relMatch[0])
  if (!targetMatch) throw new Error(`No se pudo ubicar la hoja "${nombreHoja}" en la plantilla.`)

  return `xl/${targetMatch[1].replace(/^\/?(xl\/)?/, '')}`
}

/**
 * @param {ArrayBuffer} templateBuf  bytes de plantilla-ph.xlsm
 * @param {Array<{planta,ambiente,sup_privada_construida,sup_privada_libre,sup_ideal,sup_comun_construida,sup_comun_libre}>} filas
 * @returns {Promise<Blob>}  el .xlsm llenado
 */
export async function fillSheet2(templateBuf, filas) {
  const zip = await JSZip.loadAsync(templateBuf)

  const sheetPath = await resolverRutaHoja(zip, HOJA2)
  const sheetFile = zip.file(sheetPath)
  if (!sheetFile) throw new Error('La plantilla no tiene una hoja "Hoja2".')

  const valoresPorCelda = {}
  const agregar = (col, r, valor) => {
    if (valor == null || valor === '') return
    valoresPorCelda[`${col}${r}`] = valor
  }
  filas.forEach((f, i) => {
    const r = FIRST_ROW + i
    agregar(COLUMNAS.planta, r, f.planta)
    agregar(COLUMNAS.bloque, r, f.bloque)
    agregar(COLUMNAS.ambiente, r, f.ambiente)
    agregar(COLUMNAS.sup_privada_construida, r, f.sup_privada_construida)
    agregar(COLUMNAS.sup_privada_libre, r, f.sup_privada_libre)
    agregar(COLUMNAS.sup_ideal, r, f.sup_ideal)
    agregar(COLUMNAS.sup_comun_construida, r, f.sup_comun_construida)
    agregar(COLUMNAS.sup_comun_libre, r, f.sup_comun_libre)
  })

  const sheetXml = parchearCeldas(await sheetFile.async('string'), valoresPorCelda)
  zip.file(sheetPath, sheetXml)

  // El resto de las formulas (F, J, y todo el bloque N:BA que arma Resumen /
  // Model Siscat) dependen de lo que acabamos de escribir, pero su valor
  // quedo con el numero viejo "en cache" del XML — sin esto Excel podria
  // mostrar ese valor viejo hasta que el usuario fuerce un recalculo (F9).
  const workbookXml = (await zip.file('xl/workbook.xml').async('string')).replace(
    /<calcPr\b([^>]*?)\/>/,
    (m, attrs) => (attrs.includes('fullCalcOnLoad') ? m : `<calcPr${attrs} fullCalcOnLoad="1"/>`),
  )
  zip.file('xl/workbook.xml', workbookXml)

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.ms-excel.sheet.macroEnabled.12',
    compression: 'DEFLATE',
  })
}

/** Construye las filas para fillSheet2() a partir de la tabla editada por el usuario. */
export function buildRows(paginas) {
  const filas = []
  paginas.forEach((pagina) => {
    const roles = pagina.columnRoles
    const idx = (rol) => roles.indexOf(rol)
    const iAmb = idx('ambiente')
    const iPC = idx('sup_privada_construida')
    const iPL = idx('sup_privada_libre')
    const iId = idx('sup_ideal')
    const iCC = idx('sup_comun_construida')
    const iCL = idx('sup_comun_libre')

    pagina.rows.forEach((row) => {
      const cellTxt = (i) => (i < 0 ? '' : row.cells[i]?.text?.trim() || '')
      const ambiente = cellTxt(iAmb)
      if (!ambiente) return
      filas.push({
        planta: (row.planta || '').trim(),
        bloque: (row.bloque || '').trim(),
        ambiente,
        sup_privada_construida: parseNumero(cellTxt(iPC)),
        sup_privada_libre: parseNumero(cellTxt(iPL)),
        sup_ideal: parseNumero(cellTxt(iId)),
        sup_comun_construida: parseNumero(cellTxt(iCC)),
        sup_comun_libre: parseNumero(cellTxt(iCL)),
      })
    })
  })
  return filas
}

export function downloadBlob(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

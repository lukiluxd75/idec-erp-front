/**
 * Fills `Hoja2` + `INICIO` of `plantilla-ph.xlsm` with user-reviewed rows and
 * triggers .xlsm download.
 *
 * Column mapping of Hoja2 (verified against a real filled example, "Prueba
 * PH - MARIA AUXILIADORA" — do NOT reuse the mapping from a previous version
 * of this file, the engineers swapped Planta/Bloque when they added
 * COLINDANCIAS): A (Bloque), B (Planta), C (Ambiente), D/E (Priv.
 * Construida/Libre), G (Ideal), H/I (Común Construida/Libre). Do NOT touch F
 * (=D+E) or J (=D+H): they're formulas. First data row = 10.
 *
 * Besides the per-unit rows, this also writes one SUBTOTAL row per planta
 * (column C = nombre canónico de PLANTAS_RESUMEN, D:J = `SUM()` over that
 * planta's row range) — `RESUMEN` busca esas filas con VLOOKUP contra
 * Hoja2!C10:C705 y sin ellas queda vacía (y por lo tanto MODEL SISCAT
 * también). Y los 4 totales del edificio en INICIO (C35/C36/C38/C39), que
 * alimentan sigma1/sigma2 y el % Ideal en Hoja2 y que antes quedaban en
 * blanco porque nadie los llenaba.
 *
 * IMPORTANT about formatting/colors: the template already has per-cell color
 * and format (gray "Descripción", number "0.00", borders, etc. in
 * `xl/styles.xml` via each `<c s="N">`). SheetJS free edition only handles
 * limited styles and drops `s="N"` on every touched cell. So the .xlsm is
 * edited as a ZIP of XML: JSZip rewrites only targeted cells inside
 * `xl/worksheets/sheetN.xml`, leaving style attributes, other sheets, styles
 * and VBA macros byte-intact.
 */
import JSZip from 'jszip'

const HOJA2 = 'Hoja2'
const INICIO = 'INICIO'
const COLINDANCIAS = 'COLINDANCIAS'
const FIRST_ROW = 10
const LAST_ROW = 705 // limite real de la plantilla (Hoja2!U2 suma U10:U705)

// COLINDANCIAS trae, para CADA fila de Hoja2 (real o no: subtotales y filas
// sin usar tambien tienen su bloque), un bloque de 5 filas con formulas ya
// armadas en A/B/C/D que apuntan a `Hoja2!<col><r>` (ver docstring del
// archivo) -- lo unico que la plantilla deja en blanco es la columna E
// (NORTE/ESTE/SUD/OESTE, en ese orden dentro del bloque). Bloque de la fila
// r de Hoja2 arranca en `11 + 5*(r-10)`: r=10 -> 11, r=11 -> 16, r=17 -> 46
// (verificado contra COLINDANCIAS!B46="=Hoja2!B17" en el Excel real de
// referencia). Solo se escribe E para filas con unidad real (no subtotales):
// para esas no hay ninguna sugerencia en `colindancias` y `set()` ya ignora
// valores null/undefined.
const COLINDANCIAS_OFFSET = { norte: 0, este: 1, sud: 2, oeste: 3 }
function filaBloqueColindancias(filaHoja2) {
  return 11 + 5 * (filaHoja2 - FIRST_ROW)
}

const COLUMNAS = {
  bloque: 'A',
  planta: 'B',
  ambiente: 'C',
  sup_privada_construida: 'D',
  sup_privada_libre: 'E',
  sup_ideal: 'G',
  sup_comun_construida: 'H',
  sup_comun_libre: 'I',
}

const SUBTOTAL_COLS = ['D', 'E', 'F', 'G', 'H', 'I', 'J']

// Campos de "Datos generales del edificio" que van directo a celdas fijas de
// INICIO (los nombres de campo son los que usa ResolutionPage.jsx). ci1/ci2/
// distrito/supLote se escriben como número; el resto como texto.
const INICIO_CAMPOS = {
  codigoCatastral: 'C2',
  subalcaldia: 'C4',
  distrito: 'C5',
  calle: 'E7',
  edificio: 'C9',
  zonaHomogenea: 'C11',
  ci1: 'C13',
  ci2: 'C14',
  resolucionEjecutiva: 'C25',
  fechaResolucion: 'C26',
  fechaPlanoAprobado: 'C27',
  supLote: 'C33',
}
const INICIO_CAMPOS_NUMERICOS = new Set(['distrito', 'ci1', 'ci2', 'supLote'])

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
// (`t="inlineStr"`) para no tener que tocar sharedStrings.xml. Un valor
// `{ formula }` escribe una formula real (`<f>`), usado por las filas de
// subtotal por planta -- Excel la recalcula sola (fullCalcOnLoad, ver abajo).
function construirCeldaXml(addr, attrsPrevios, valor) {
  const estilo = /\ss="(\d+)"/.exec(attrsPrevios || '')
  const sAttr = estilo ? ` s="${estilo[1]}"` : ''
  if (valor && typeof valor === 'object' && 'formula' in valor) {
    return `<c r="${addr}"${sAttr}><f>${escapeXml(valor.formula)}</f></c>`
  }
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
      `La plantilla no tiene celda para: ${[...pendientes].join(', ')} (¿son demasiadas filas para la Hoja2?)`,
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

// Agrupa las filas por planta EN ORDEN DE PRIMERA APARICION, sin importar de
// que pagina/foto vino cada una -- asi el rango de cada subtotal (SUM) es
// siempre contiguo en Hoja2, aunque en el papel una misma planta este
// repartida entre fotos.
function agruparPorPlanta(filas) {
  const grupos = []
  const porPlanta = new Map()
  filas.forEach((f) => {
    const key = f.planta
    let grupo = porPlanta.get(key)
    if (!grupo) {
      grupo = { planta: key, filas: [] }
      porPlanta.set(key, grupo)
      grupos.push(grupo)
    }
    grupo.filas.push(f)
  })
  return grupos
}

/**
 * @param {ArrayBuffer} templateBuf  bytes de plantilla-ph.xlsm
 * @param {Array<{planta,bloque,ambiente,sup_privada_construida,sup_privada_libre,sup_ideal,sup_comun_construida,sup_comun_libre}>} filas
 * @param {Record<string,string|number>} [datosGenerales]  campos de INICIO (ver INICIO_CAMPOS)
 * @param {Record<string,Record<string,{norte,este,sud,oeste}>>} [colindancias]  colindancias[planta][ambiente] -> ver ColindanciasSection.jsx
 * @returns {Promise<Blob>}  el .xlsm llenado
 */
export async function fillSheet2(templateBuf, filas, datosGenerales = {}, colindancias = {}) {
  const sinPlanta = filas.filter((f) => !f.planta)
  if (sinPlanta.length > 0) {
    throw new Error(`Falta asignar la Planta de ${sinPlanta.length} fila(s) (columna "Planta" en la tabla).`)
  }

  const zip = await JSZip.loadAsync(templateBuf)

  const hoja2Path = await resolverRutaHoja(zip, HOJA2)
  const inicioPath = await resolverRutaHoja(zip, INICIO)

  const valoresHoja2 = {}
  const set = (col, r, valor) => {
    if (valor == null || valor === '') return
    valoresHoja2[`${col}${r}`] = valor
  }

  const valoresColindancias = {}
  const setColindancia = (filaHoja2, direccion, valor) => {
    if (valor == null || valor === '') return
    const base = filaBloqueColindancias(filaHoja2)
    valoresColindancias[`E${base + COLINDANCIAS_OFFSET[direccion]}`] = valor
  }

  // Filas de datos, reagrupadas de forma contigua por planta, + una fila de
  // subtotal al cierre de cada grupo (misma mecanica que la fila 15 "PLANTA
  // SEMISOTANO" del ejemplo real: C=nombre de planta, D:J=SUM del rango).
  let cursor = FIRST_ROW
  agruparPorPlanta(filas).forEach((grupo) => {
    const inicioRango = cursor
    grupo.filas.forEach((f) => {
      const r = cursor++
      set(COLUMNAS.bloque, r, f.bloque)
      set(COLUMNAS.planta, r, f.planta)
      set(COLUMNAS.ambiente, r, f.ambiente)
      set(COLUMNAS.sup_privada_construida, r, f.sup_privada_construida)
      set(COLUMNAS.sup_privada_libre, r, f.sup_privada_libre)
      set(COLUMNAS.sup_ideal, r, f.sup_ideal)
      set(COLUMNAS.sup_comun_construida, r, f.sup_comun_construida)
      set(COLUMNAS.sup_comun_libre, r, f.sup_comun_libre)

      const sugerencia = colindancias[f.planta]?.[f.ambiente]
      if (sugerencia) {
        setColindancia(r, 'norte', sugerencia.norte)
        setColindancia(r, 'este', sugerencia.este)
        setColindancia(r, 'sud', sugerencia.sud)
        setColindancia(r, 'oeste', sugerencia.oeste)
      }
    })
    const finRango = cursor - 1
    const filaSubtotal = cursor++
    set(COLUMNAS.ambiente, filaSubtotal, grupo.planta)
    SUBTOTAL_COLS.forEach((col) => set(col, filaSubtotal, { formula: `SUM(${col}${inicioRango}:${col}${finRango})` }))
  })
  if (cursor - 1 > LAST_ROW) {
    throw new Error(`Demasiadas filas para la plantilla (máx. ${LAST_ROW - FIRST_ROW + 1} filas de datos+subtotal).`)
  }

  // Totales del edificio (INICIO!C35/C36/C38/C39): suma sobre las filas de
  // DATOS unicamente (no las de subtotal, para no contar doble).
  const totales = filas.reduce(
    (acc, f) => ({
      privConstruida: acc.privConstruida + (f.sup_privada_construida || 0),
      privLibre: acc.privLibre + (f.sup_privada_libre || 0),
      comunConstruida: acc.comunConstruida + (f.sup_comun_construida || 0),
      comunLibre: acc.comunLibre + (f.sup_comun_libre || 0),
    }),
    { privConstruida: 0, privLibre: 0, comunConstruida: 0, comunLibre: 0 },
  )
  const redondear = (n) => Math.round(n * 100) / 100

  const valoresInicio = {}
  Object.entries(INICIO_CAMPOS).forEach(([campo, addr]) => {
    const v = datosGenerales[campo]
    if (v === undefined || v === null || v === '') return
    valoresInicio[addr] = INICIO_CAMPOS_NUMERICOS.has(campo) ? Number(v) : v
  })
  valoresInicio.C35 = redondear(totales.privConstruida)
  valoresInicio.C36 = redondear(totales.privLibre)
  valoresInicio.C38 = redondear(totales.comunConstruida)
  valoresInicio.C39 = redondear(totales.comunLibre)

  zip.file(hoja2Path, parchearCeldas(await zip.file(hoja2Path).async('string'), valoresHoja2))
  zip.file(inicioPath, parchearCeldas(await zip.file(inicioPath).async('string'), valoresInicio))

  if (Object.keys(valoresColindancias).length > 0) {
    const colindanciasPath = await resolverRutaHoja(zip, COLINDANCIAS)
    zip.file(
      colindanciasPath,
      parchearCeldas(await zip.file(colindanciasPath).async('string'), valoresColindancias),
    )
  }

  // El resto de las formulas (F, J, el bloque N:BA de cada fila, RESUMEN,
  // MODEL SISCAT) dependen de lo que acabamos de escribir, pero su valor
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

// Re-exportado por compatibilidad: quedó acá antes de que downloadBlob se
// volviera compartido (ver src/shared/utils/download.util.js).
export { downloadBlob } from '@/shared/utils'

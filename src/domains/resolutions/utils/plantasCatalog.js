/**
 * Nombres de planta EXACTOS que `RESUMEN!B12:B46` busca con VLOOKUP contra la
 * columna C de Hoja2 (fila de subtotal de cada planta). Si el texto no
 * coincide caracter a caracter (incluido el "º") la búsqueda falla en
 * silencio (IFERROR -> "") y esa planta desaparece de RESUMEN/MODEL SISCAT.
 * Por eso "Planta" en la tabla de superficies es un <select> con esta lista
 * fija, no texto libre.
 *
 * Verificado contra los shared strings de la plantilla real (2026-09-28):
 * son exactamente estos 35 -- SOTANO, SEMISOTANO, BAJA y 1º a 32º PISO, ni
 * uno más (no hay "CUBIERTA" ni nada más alto que 32º). "CUBIERTA" se
 * detecta y se omite en surfacesOcrParser.js -- agregarla acá no alcanza,
 * la plantilla necesitaría una fila nueva en RESUMEN y una columna nueva en
 * MODEL SISCAT (tabla transpuesta), que no se tocaron por el riesgo de
 * romper el formulario oficial sin poder abrirlo en Excel para confirmar.
 */
export const PLANTAS_RESUMEN = [
  'PLANTA SOTANO',
  'PLANTA SEMISOTANO',
  'PLANTA BAJA',
  ...Array.from({ length: 32 }, (_, i) => `PLANTA ${i + 1}º PISO`),
]

function normPlanta(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim()
}

/** Adivina la planta canónica a partir del texto crudo leído por el OCR
 * ("PLANTA SEMISOTANO", "5to piso", "PB", ...), para preseleccionar el
 * <select> -- el usuario siempre puede corregirlo. Sin match, '' (el
 * usuario elige a mano). */
export function guessPlantaCanonica(rawText) {
  const s = normPlanta(rawText)
  if (!s) return ''
  if (s.includes('SEMISOTANO')) return 'PLANTA SEMISOTANO'
  if (s.includes('SOTANO')) return 'PLANTA SOTANO'
  if (s.includes('BAJA') || /^PB\b/.test(s)) return 'PLANTA BAJA'
  const m = s.match(/(\d+)/)
  if (m) {
    const n = parseInt(m[1], 10)
    if (n >= 1 && n <= 30) return `PLANTA ${n}º PISO`
  }
  return ''
}

/** Plantas de una página del plano: `plantas` si el backend las manda (varias
 * en un plano tipo), si no `planta` (backend anterior). [] mientras se detecta. */
export function plantasDePagina(p) {
  if (p.plantas?.length) return p.plantas
  return p.planta ? [p.planta] : []
}

/**
 * Nombres de planta EXACTOS que `RESUMEN!B12:B44` busca con VLOOKUP contra la
 * columna C de Hoja2 (fila de subtotal de cada planta). Si el texto no
 * coincide caracter a caracter (incluido el "º") la búsqueda falla en
 * silencio (IFERROR -> "") y esa planta desaparece de RESUMEN/MODEL SISCAT.
 * Por eso "Planta" en la tabla de superficies es un <select> con esta lista
 * fija, no texto libre.
 */
export const PLANTAS_RESUMEN = [
  'PLANTA SOTANO',
  'PLANTA SEMISOTANO',
  'PLANTA BAJA',
  ...Array.from({ length: 30 }, (_, i) => `PLANTA ${i + 1}º PISO`),
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

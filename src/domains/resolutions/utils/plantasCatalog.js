export const PLANTAS_RESUMEN = [
  'PLANTA SOTANO',
  'PLANTA SEMISOTANO',
  'PLANTA BAJA',
  ...Array.from({ length: 32 }, (_, i) => `PLANTA ${i + 1}º PISO`),
  // Terraza (azotea habitable con areas comunes, p. ej. "PLANTA TERRAZA" del
  // formato 3). La plantilla NO tiene fila para ella en RESUMEN: sus filas si se
  // escriben en Hoja2 (con su subtotal), pero RESUMEN/MODEL SISCAT no la
  // suman hasta que la plantilla oficial la incluya.
  'PLANTA TERRAZA',
]

function normPlanta(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim()
}

export function guessPlantaCanonica(rawText) {
  const s = normPlanta(rawText)
  if (!s) return ''
  if (s.includes('SEMISOTANO')) return 'PLANTA SEMISOTANO'
  if (s.includes('SOTANO')) return 'PLANTA SOTANO'
  if (s.includes('BAJA') || /^PB\b/.test(s)) return 'PLANTA BAJA'
  if (s.includes('TERRAZA')) return 'PLANTA TERRAZA'
  const m = s.match(/(\d+)/)
  if (m) {
    const n = parseInt(m[1], 10)
    if (n >= 1 && n <= 30) return `PLANTA ${n}º PISO`
  }
  return ''
}

export function plantasDePagina(p) {
  if (p.plantas?.length) return p.plantas
  return p.planta ? [p.planta] : []
}
